import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException

from ...database import db
from ...prisma_client.enums import Role
from .clerk_utils import create_clerk_invitation


async def create_invitation(
    email: str, organization_id: str, inviter_id: str, role: Role
):
    """
    Creates a new invitation for a user to join an organization.
    """
    # Ensure DB is connected
    if not db.is_connected():
        await db.connect()

    token = str(uuid.uuid4())
    # 7 days expiration as per spec
    expires_at = datetime.now() + timedelta(days=7)

    # 1. Create local invitation record
    invitation = await db.invitation.create(
        data={
            "email": email,
            "token": token,
            "organizationId": organization_id,
            "inviterId": inviter_id,
            "role": role,
            "expiresAt": expires_at,
        }
    )

    # 2. Trigger Clerk Invitation
    # We pass the organization ID in metadata so we can track it later if needed
    # The redirect URL should point to your sign-up page
    # You might want to parameterize the base URL
    try:
        await create_clerk_invitation(
            email=email,
            public_metadata={
                "organization_id": organization_id,
                "role": role,
                "invitation_token": token,
            },
            # Assuming standard Clerk redirect, or specific app page
            # redirect_url="http://localhost:3000/sign-up"
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
        # We might want to rollback the DB creation here, but for now we'll just log it.
        # raising exception will return error to frontend
        raise e

    print(f"Invitation created locally for {email} to join org {organization_id}")

    return invitation


async def accept_invitation(token: str, user_id: str):
    """
    Accepts an invitation, adding the user to the organization.
    """
    if not db.is_connected():
        await db.connect()

    invitation = await db.invitation.find_unique(
        where={"token": token}, include={"organization": True}
    )

    if not invitation:
        return None, "Invalid invitation token"

    if invitation.acceptedAt:
        return None, "Invitation already accepted"

    if invitation.expiresAt < datetime.now():
        return None, "Invitation expired"

    # Add user to organization
    await db.organizationmember.create(
        data={
            "userId": user_id,
            "organizationId": invitation.organizationId,
            "role": invitation.role,
        }
    )

    # Mark invitation as accepted
    updated_invitation = await db.invitation.update(
        where={"id": invitation.id}, data={"acceptedAt": datetime.now()}
    )

    return updated_invitation, None


async def get_user_with_memberships(user_id: str):
    """
    Fetches a user by ID, including their organization memberships.
    """
    if not db.is_connected():
        await db.connect()

    return await db.user.find_unique(
        where={"id": user_id},
        include={"memberships": {"include": {"organization": True, "house": True}}},
    )
