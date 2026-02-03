import uuid
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import HTTPException

from ...database import db
from .clerk_utils import create_clerk_invitation


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
