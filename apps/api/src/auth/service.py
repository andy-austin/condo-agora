import uuid
from datetime import datetime, timedelta

from ...database import db
from ...prisma_client.enums import Role


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

    # TODO: Integrate with an email service (e.g., Resend, SendGrid)
    print(f"Invitation created for {email} to join org {organization_id}")

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
        include={"memberships": {"include": {"organization": True}}},
    )
