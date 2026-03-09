import uuid
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import HTTPException

from ...database import db
from .clerk_utils import create_clerk_invitation


def _slugify(text: str) -> str:
    """Convert a string to a URL-friendly slug."""
    import re
    import unicodedata

    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


async def create_organization(name: str, creator_user_id: str):
    """
    Create a new organization and make the creator an ADMIN.
    Returns the created organization document.
    """
    if not db.is_connected():
        await db.connect()

    slug = _slugify(name)

    # Check for slug uniqueness, append number if needed
    existing = await db.db.organizations.find_one({"slug": slug})
    if existing:
        counter = 1
        while await db.db.organizations.find_one({"slug": f"{slug}-{counter}"}):
            counter += 1
        slug = f"{slug}-{counter}"

    now = datetime.utcnow()
    org_data = {
        "name": name,
        "slug": slug,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.db.organizations.insert_one(org_data)
    org_data["_id"] = result.inserted_id

    # Add creator as ADMIN
    member_data = {
        "user_id": creator_user_id,
        "organization_id": str(result.inserted_id),
        "role": "ADMIN",
        "house_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.db.organization_members.insert_one(member_data)

    return org_data


async def create_invitation(
    email: str, organization_id: str, inviter_id: str, role: str
):
    """
    Creates a new invitation for a user to join an organization.
    """
    if not db.is_connected():
        await db.connect()

    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation_data = {
        "email": email,
        "token": token,
        "organization_id": organization_id,
        "inviter_id": inviter_id,
        "role": role,
        "expires_at": expires_at,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "accepted_at": None,
    }

    result = await db.db.invitations.insert_one(invitation_data)
    invitation_data["_id"] = str(result.inserted_id)

    # Trigger Clerk Invitation
    try:
        await create_clerk_invitation(
            email=email,
            redirect_url="https://condo-agora.vercel.app/dashboard",
            public_metadata={
                "organization_id": organization_id,
                "role": role,
                "invitation_token": token,
            },
        )
        print(f"Clerk invitation sent to {email}")
    except HTTPException as e:
        if e.status_code == 422 and "form_identifier_exists" in str(e.detail):
            print(f"User {email} already exists in Clerk. Skipping Clerk invitation.")
        else:
            print(f"Failed to send Clerk invitation: {e}")
            raise e
    except Exception as e:
        print(f"Failed to send Clerk invitation: {e}")
        raise e

    print(f"Invitation created locally for {email} to join org {organization_id}")

    return invitation_data


async def accept_invitation(token: str, user_id: str):
    """
    Accepts an invitation, adding the user to the organization.
    """
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"token": token})

    if not invitation:
        return None, "Invalid invitation token"

    if invitation.get("accepted_at"):
        return None, "Invitation already accepted"

    if invitation.get("expires_at") < datetime.utcnow():
        return None, "Invitation expired"

    # Add user to organization
    member_data = {
        "user_id": user_id,
        "organization_id": invitation["organization_id"],
        "role": invitation["role"],
        "house_id": invitation.get("house_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.db.organization_members.insert_one(member_data)

    # Mark invitation as accepted
    now = datetime.utcnow()
    updated_invitation = await db.db.invitations.find_one_and_update(
        {"_id": invitation["_id"]},
        {"$set": {"accepted_at": now, "updated_at": now}},
        return_document=True,
    )

    return updated_invitation, None


async def get_organization_members(organization_id: str):
    """
    Get all members of an organization with their user details.
    """
    if not db.is_connected():
        await db.connect()

    members = []
    cursor = db.db.organization_members.find({"organization_id": organization_id})
    async for member in cursor:
        # Fetch user info
        user = await db.db.users.find_one({"_id": ObjectId(member["user_id"])})
        member["user"] = user

        # Fetch house if assigned
        house = None
        if member.get("house_id"):
            try:
                house = await db.db.houses.find_one(
                    {"_id": ObjectId(member["house_id"])}
                )
            except Exception:
                pass
        member["house"] = house

        # Fetch org
        org = await db.db.organizations.find_one(
            {"_id": ObjectId(member["organization_id"])}
        )
        member["organization"] = org

        members.append(member)

    return members


async def update_member_role(member_id: str, new_role: str, admin_user_id: str):
    """
    Update a member's role. Prevents removing the last admin.
    """
    if not db.is_connected():
        await db.connect()

    member = await db.db.organization_members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise Exception("Member not found")

    org_id = member["organization_id"]

    # If demoting from ADMIN, check we're not removing the last admin
    if member["role"] == "ADMIN" and new_role != "ADMIN":
        admin_count = await db.db.organization_members.count_documents(
            {"organization_id": org_id, "role": "ADMIN"}
        )
        if admin_count <= 1:
            raise Exception(
                "Cannot remove the last administrator. "
                "Promote another member to admin first."
            )

    # Prevent self-demotion from admin
    if member["user_id"] == admin_user_id and new_role != "ADMIN":
        raise Exception(
            "You cannot demote yourself. Ask another admin to change your role."
        )

    now = datetime.utcnow()
    updated = await db.db.organization_members.find_one_and_update(
        {"_id": ObjectId(member_id)},
        {"$set": {"role": new_role, "updated_at": now}},
        return_document=True,
    )

    # Fetch related data
    user = await db.db.users.find_one({"_id": ObjectId(updated["user_id"])})
    updated["user"] = user

    org = await db.db.organizations.find_one(
        {"_id": ObjectId(updated["organization_id"])}
    )
    updated["organization"] = org

    house = None
    if updated.get("house_id"):
        try:
            house = await db.db.houses.find_one({"_id": ObjectId(updated["house_id"])})
        except Exception:
            pass
    updated["house"] = house

    return updated


async def get_user_with_memberships(user_id: str):
    """
    Fetches a user by ID, including their organization memberships.
    Uses aggregation to join related collections.
    """
    if not db.is_connected():
        await db.connect()

    try:
        user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None

    if not user:
        return None

    # Fetch memberships for this user
    memberships = []
    cursor = db.db.organization_members.find({"user_id": str(user["_id"])})
    async for membership in cursor:
        # Fetch organization for this membership
        org = await db.db.organizations.find_one(
            {"_id": ObjectId(membership["organization_id"])}
        )

        # Fetch house if assigned
        house = None
        if membership.get("house_id"):
            house = await db.db.houses.find_one(
                {"_id": ObjectId(membership["house_id"])}
            )

        membership["organization"] = org
        membership["house"] = house
        memberships.append(membership)

    user["memberships"] = memberships
    return user
