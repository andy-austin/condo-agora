import re
import uuid
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import HTTPException

from ...database import db
from .clerk_utils import create_clerk_invitation

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _get_app_url() -> str:
    """Resolve the app base URL from environment variables."""
    import os

    return os.getenv("NEXT_PUBLIC_APP_URL") or (
        f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}"
        if os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
        else (
            f"https://{os.getenv('VERCEL_URL')}"
            if os.getenv("VERCEL_URL")
            else "http://localhost:3000"
        )
    )


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
    email: str,
    organization_id: str,
    inviter_id: str,
    role: str,
    method: str = "EMAIL",
):
    """
    Creates a new invitation for a user to join an organization.
    Validates email, prevents duplicates, and notifies existing users.
    """
    from ..notification.service import create_notification

    if not db.is_connected():
        await db.connect()

    # Validate email format
    if not EMAIL_REGEX.match(email):
        raise Exception("Invalid email address format")

    # Check for existing pending invitation (same email + org)
    now = datetime.utcnow()
    existing = await db.db.invitations.find_one(
        {
            "email": email,
            "organization_id": organization_id,
            "accepted_at": None,
        }
    )
    if existing:
        if existing.get("expires_at") and existing["expires_at"] > now:
            raise Exception("Invitation already pending for this email")
        # Expired — remove old one and proceed
        await db.db.invitations.delete_one({"_id": existing["_id"]})

    token = str(uuid.uuid4())
    expires_at = now + timedelta(days=7)

    invitation_data = {
        "email": email,
        "token": token,
        "organization_id": organization_id,
        "inviter_id": inviter_id,
        "role": role,
        "method": method,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
    }

    result = await db.db.invitations.insert_one(invitation_data)
    invitation_data["_id"] = str(result.inserted_id)

    # Trigger Clerk Invitation
    redirect_url = f"{_get_app_url()}/dashboard"

    try:
        await create_clerk_invitation(
            email=email,
            redirect_url=redirect_url,
            public_metadata={
                "organization_id": organization_id,
                "role": role,
                "invitation_token": token,
            },
        )
        print(f"Clerk invitation sent to {email}")
    except HTTPException as e:
        if e.status_code == 422 and "form_identifier_exists" in str(e.detail):
            print(f"User {email} already exists in Clerk. Sending in-app notification.")
            # Notify existing user via in-app notification
            existing_user = await db.db.users.find_one({"email": email})
            if existing_user:
                org = await db.db.organizations.find_one(
                    {"_id": ObjectId(organization_id)}
                )
                org_name = org["name"] if org else "an organization"
                await create_notification(
                    user_id=str(existing_user["_id"]),
                    organization_id=organization_id,
                    notification_type="INVITATION",
                    title="New Invitation",
                    message=f"You have been invited to join {org_name}",
                    reference_id=str(invitation_data["_id"]),
                )
        else:
            print(f"Failed to send Clerk invitation: {e}")
            raise e
    except Exception as e:
        print(f"Failed to send Clerk invitation: {e}")
        raise e

    print(f"Invitation created locally for {email} to join org {organization_id}")

    return invitation_data


async def accept_invitation_by_id(invitation_id: str, user_id: str):
    """
    Accepts an invitation by ID, adding the user to the organization.
    Used when existing users click on invitation notifications.
    """
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})

    if not invitation:
        raise Exception("Invitation not found")

    if invitation.get("accepted_at"):
        raise Exception("Invitation already accepted")

    if invitation.get("expires_at") and invitation["expires_at"] < datetime.utcnow():
        raise Exception("Invitation has expired")

    # Verify user's email matches invitation
    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("email") != invitation["email"]:
        raise Exception("This invitation is not for your account")

    # Check for duplicate membership
    existing_member = await db.db.organization_members.find_one(
        {
            "user_id": user_id,
            "organization_id": invitation["organization_id"],
        }
    )
    if existing_member:
        # Already a member, just mark invitation as accepted
        now = datetime.utcnow()
        await db.db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"accepted_at": now, "updated_at": now}},
        )
        return await db.db.invitations.find_one({"_id": invitation["_id"]})

    # Add user to organization
    now = datetime.utcnow()
    member_data = {
        "user_id": user_id,
        "organization_id": invitation["organization_id"],
        "role": invitation["role"],
        "house_id": invitation.get("house_id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.db.organization_members.insert_one(member_data)

    # Mark invitation as accepted
    updated_invitation = await db.db.invitations.find_one_and_update(
        {"_id": invitation["_id"]},
        {"$set": {"accepted_at": now, "updated_at": now}},
        return_document=True,
    )

    return updated_invitation


async def get_pending_invitations(organization_id: str):
    """Get all pending (not accepted, not expired) invitations for an org."""
    if not db.is_connected():
        await db.connect()

    now = datetime.utcnow()
    invitations = []
    cursor = db.db.invitations.find(
        {
            "organization_id": organization_id,
            "accepted_at": None,
            "expires_at": {"$gt": now},
        }
    ).sort("created_at", -1)
    async for inv in cursor:
        invitations.append(inv)
    return invitations


async def revoke_invitation(invitation_id: str):
    """Delete a pending invitation."""
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise Exception("Invitation not found")

    if invitation.get("accepted_at"):
        raise Exception("Cannot revoke an already accepted invitation")

    await db.db.invitations.delete_one({"_id": ObjectId(invitation_id)})
    return invitation["organization_id"]


async def resend_invitation(invitation_id: str):
    """Resend a pending invitation via Clerk."""
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise Exception("Invitation not found")

    if invitation.get("accepted_at"):
        raise Exception("Cannot resend an already accepted invitation")

    # Resend via Clerk
    redirect_url = f"{_get_app_url()}/dashboard"

    try:
        await create_clerk_invitation(
            email=invitation["email"],
            redirect_url=redirect_url,
            public_metadata={
                "organization_id": invitation["organization_id"],
                "role": invitation["role"],
                "invitation_token": invitation["token"],
            },
        )
    except HTTPException as e:
        if e.status_code == 422 and "form_identifier_exists" in str(e.detail):
            print(f"User {invitation['email']} already exists in Clerk.")
        else:
            raise e

    # Update timestamp
    now = datetime.utcnow()
    updated = await db.db.invitations.find_one_and_update(
        {"_id": ObjectId(invitation_id)},
        {"$set": {"updated_at": now}},
        return_document=True,
    )
    return updated


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
