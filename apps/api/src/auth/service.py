import os
import re
import uuid
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import HTTPException

from ...database import db
from .channels import send_email_invitation, send_whatsapp_invitation

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_REGEX = re.compile(r"^\+?[1-9]\d{6,14}$")


def _get_app_url() -> str:
    """Resolve the app base URL from environment variables."""
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


async def complete_user_profile(
    user_id: str,
    first_name: str = None,
    last_name: str = None,
) -> dict:
    """
    Marks a user's profile as complete and optionally updates name fields.
    Clears the requires_profile_completion flag in both MongoDB and Clerk.
    """
    if not db.is_connected():
        await db.connect()

    from bson import ObjectId as _ObjectId

    user = await db.db.users.find_one({"_id": _ObjectId(user_id)})
    if not user:
        raise Exception("User not found")

    update_fields = {
        "requires_profile_completion": False,
        "updated_at": datetime.utcnow(),
    }
    if first_name is not None:
        update_fields["first_name"] = first_name
    if last_name is not None:
        update_fields["last_name"] = last_name

    await db.db.users.update_one(
        {"_id": _ObjectId(user_id)},
        {"$set": update_fields},
    )

    return await db.db.users.find_one({"_id": _ObjectId(user_id)})


async def create_invitation(
    identifier: str,
    organization_id: str,
    inviter_id: str,
    role: str,
    channel: str = "email",
):
    """
    Creates a new invitation for a user to join an organization.
    Validates identifier (email or phone), prevents duplicates, and sends
    an invitation via the specified channel (email or whatsapp).
    """
    from ..notification.service import create_notification

    if not db.is_connected():
        await db.connect()

    # Validate identifier format based on channel
    if channel == "whatsapp":
        if not PHONE_REGEX.match(identifier):
            raise Exception("Invalid phone number format for WhatsApp")
    else:
        if not EMAIL_REGEX.match(identifier):
            raise Exception("Invalid email address format")

    # Check for existing pending invitation (same identifier + org)
    now = datetime.utcnow()
    existing = await db.db.invitations.find_one(
        {
            "identifier": identifier,
            "organization_id": organization_id,
            "accepted_at": None,
        }
    )
    if existing:
        # Remove old invitation (pending or expired) and resend
        await db.db.invitations.delete_one({"_id": existing["_id"]})

    token = str(uuid.uuid4())
    expires_at = now + timedelta(days=7)

    invitation_data = {
        "identifier": identifier,
        "channel": channel,
        "token": token,
        "organization_id": organization_id,
        "inviter_id": inviter_id,
        "role": role,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
        "accepted_at": None,
    }

    result = await db.db.invitations.insert_one(invitation_data)
    invitation_data["_id"] = str(result.inserted_id)

    # Look up org name for the invitation message
    org = await db.db.organizations.find_one({"_id": ObjectId(organization_id)})
    org_name = org["name"] if org else "Condo Agora"

    invite_url = f"{_get_app_url()}/invite/{token}"

    try:
        if channel == "whatsapp":
            await send_whatsapp_invitation(
                to=identifier, org_name=org_name, invite_url=invite_url
            )
        else:
            await send_email_invitation(
                to=identifier, org_name=org_name, invite_url=invite_url
            )
        print(f"Invitation sent to {identifier} via {channel}")
    except Exception as e:
        # If the user already exists locally, fall back to in-app notification
        existing_user = await db.db.users.find_one({"email": identifier})
        if existing_user:
            print(
                f"Failed to send {channel} invitation to {identifier}, "
                "sending in-app notification instead."
            )
            await create_notification(
                user_id=str(existing_user["_id"]),
                organization_id=organization_id,
                notification_type="INVITATION",
                title="New Invitation",
                message=f"You have been invited to join {org_name}",
                reference_id=str(invitation_data["_id"]),
            )
        else:
            print(f"Failed to send invitation: {e}")
            raise e

    print(f"Invitation created for {identifier} to join org {organization_id}")

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

    # Verify user's email or phone matches invitation identifier
    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    identifier = invitation.get("identifier") or invitation.get("email")
    if not user or (
        user.get("email") != identifier and user.get("phone") != identifier
    ):
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
    """Resend a pending invitation via the original channel."""
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise Exception("Invitation not found")

    if invitation.get("accepted_at"):
        raise Exception("Cannot resend an already accepted invitation")

    # Look up org name for the invitation message
    org = await db.db.organizations.find_one(
        {"_id": ObjectId(invitation["organization_id"])}
    )
    org_name = org["name"] if org else "Condo Agora"

    identifier = invitation.get("identifier") or invitation.get("email", "")
    channel = invitation.get("channel", "email")
    invite_url = f"{_get_app_url()}/invite/{invitation['token']}"

    try:
        if channel == "whatsapp":
            await send_whatsapp_invitation(
                to=identifier, org_name=org_name, invite_url=invite_url
            )
        else:
            await send_email_invitation(
                to=identifier, org_name=org_name, invite_url=invite_url
            )
    except Exception as e:
        print(f"Failed to resend invitation to {identifier} via {channel}: {e}")
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


async def remove_member_from_organization(member_id: str, admin_user_id: str):
    """
    Removes a member from the organization and all related data.
    Admin only. Cannot remove yourself or the last admin.
    """
    if not db.is_connected():
        await db.connect()

    member = await db.db.organization_members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise Exception("Member not found")

    org_id = member["organization_id"]
    target_user_id = member["user_id"]

    # Prevent self-removal
    if target_user_id == admin_user_id:
        raise Exception("You cannot remove yourself from the organization.")

    # Prevent removing the last admin
    if member["role"] == "ADMIN":
        admin_count = await db.db.organization_members.count_documents(
            {"organization_id": org_id, "role": "ADMIN"}
        )
        if admin_count <= 1:
            raise Exception(
                "Cannot remove the last administrator. "
                "Promote another member to admin first."
            )

    # 1. Clear house assignments — unset voter_user_id if this user is the voter
    if member.get("house_id"):
        await db.db.houses.update_many(
            {"voter_user_id": target_user_id},
            {"$set": {"voter_user_id": None}},
        )

    # 2. Delete organization membership
    await db.db.organization_members.delete_one({"_id": ObjectId(member_id)})

    # 3. Delete notifications for this user in this org
    await db.db.notifications.delete_many(
        {"user_id": target_user_id, "organization_id": org_id}
    )

    # 4. Check if user has memberships in other orgs
    other_memberships = await db.db.organization_members.count_documents(
        {"user_id": target_user_id}
    )

    if other_memberships == 0:
        # No other org memberships — remove user entirely
        await db.db.users.delete_one({"_id": ObjectId(target_user_id)})

        # Delete any remaining notifications
        await db.db.notifications.delete_many({"user_id": target_user_id})

    return org_id
