import strawberry
from typing import Any
from ..src.auth.service import create_invitation as service_create_invitation
from ..graphql_types.auth import Invitation, Role


async def resolve_create_invitation(
    info: Any, email: str, organization_id: str, role: Role
) -> Invitation:
    """
    Resolver for creating an invitation.
    """
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    invitation = await service_create_invitation(
        email=email,
        organization_id=organization_id,
        inviter_id=user.id,
        role=role.value,  # Get string value for Prisma
    )

    return Invitation(
        id=invitation.id,
        email=invitation.email,
        token=invitation.token,
        organization_id=invitation.organizationId,
        inviter_id=invitation.inviterId,
        role=Role(invitation.role),
        expires_at=invitation.expiresAt,
        created_at=invitation.createdAt,
        accepted_at=invitation.acceptedAt,
    )
