from typing import Any, Optional

from ..graphql_types.auth import (
    Invitation,
    Organization,
    OrganizationMember,
    Role,
    User,
)
from ..graphql_types.house import House
from ..src.auth.service import create_invitation as service_create_invitation
from ..src.auth.service import get_user_with_memberships


def _prisma_house_to_graphql(h) -> House:
    """Convert a Prisma House model to GraphQL House type."""
    return House(
        id=h.id,
        name=h.name,
        organization_id=h.organizationId,
        created_at=h.createdAt,
        updated_at=h.updatedAt,
    )


async def resolve_me(info: Any) -> Optional[User]:
    """
    Resolver for the current authenticated user.
    """
    user_context = info.context.get("user")
    if not user_context:
        return None

    user_data = await get_user_with_memberships(user_context.id)
    if not user_data:
        return None

    memberships = []
    if user_data.memberships:
        for m in user_data.memberships:
            house = None
            if m.house:
                house = _prisma_house_to_graphql(m.house)

            memberships.append(
                OrganizationMember(
                    id=m.id,
                    user_id=m.userId,
                    organization_id=m.organizationId,
                    house_id=m.houseId,
                    role=Role(m.role.name),
                    created_at=m.createdAt,
                    organization=Organization(
                        id=m.organization.id,
                        name=m.organization.name,
                        slug=m.organization.slug,
                        created_at=m.organization.createdAt,
                        updated_at=m.organization.updatedAt,
                    ),
                    house=house,
                )
            )

    return User(
        id=user_data.id,
        clerk_id=user_data.clerkId,
        email=user_data.email,
        first_name=user_data.firstName,
        last_name=user_data.lastName,
        avatar_url=user_data.avatarUrl,
        created_at=user_data.createdAt,
        updated_at=user_data.updatedAt,
        memberships=memberships,
    )


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
        role=role.value,
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
