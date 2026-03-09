from typing import List, Optional

import strawberry

from ..graphql_types.auth import (
    Invitation,
    MemberWithUser,
    Organization,
    OrganizationMember,
    Role,
    User,
)
from ..graphql_types.house import House
from ..src.auth.permissions import require_org_admin
from ..src.auth.service import create_invitation as service_create_invitation
from ..src.auth.service import create_organization as service_create_org
from ..src.auth.service import get_organization_members as service_get_members
from ..src.auth.service import get_user_with_memberships
from ..src.auth.service import update_member_role as service_update_role


def _mongo_house_to_graphql(h: dict) -> House:
    """Convert a MongoDB House document to GraphQL House type."""
    return House(
        id=str(h["_id"]),
        name=h["name"],
        organization_id=h["organization_id"],
        created_at=h["created_at"],
        updated_at=h["updated_at"],
    )


async def resolve_me(info: strawberry.types.Info) -> Optional[User]:
    """
    Resolver for the current authenticated user.
    """
    user_context = info.context.get("user")
    if not user_context:
        return None

    user_id = user_context.get("id") or str(user_context.get("_id"))
    user_data = await get_user_with_memberships(user_id)
    if not user_data:
        return None

    memberships = []
    if user_data.get("memberships"):
        for m in user_data["memberships"]:
            house = None
            if m.get("house"):
                house = _mongo_house_to_graphql(m["house"])

            org = m.get("organization")
            memberships.append(
                OrganizationMember(
                    id=str(m["_id"]),
                    user_id=m["user_id"],
                    organization_id=m["organization_id"],
                    house_id=m.get("house_id"),
                    role=Role(m["role"]),
                    created_at=m["created_at"],
                    organization=Organization(
                        id=str(org["_id"]),
                        name=org["name"],
                        slug=org["slug"],
                        created_at=org["created_at"],
                        updated_at=org["updated_at"],
                    ),
                    house=house,
                )
            )

    return User(
        id=str(user_data["_id"]),
        clerk_id=user_data["clerk_id"],
        email=user_data["email"],
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        avatar_url=user_data.get("avatar_url"),
        created_at=user_data["created_at"],
        updated_at=user_data["updated_at"],
        memberships=memberships,
    )


async def resolve_create_invitation(
    info: strawberry.types.Info, email: str, organization_id: str, role: Role
) -> Invitation:
    """
    Resolver for creating an invitation.
    """
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    user_id = user.get("id") or str(user.get("_id"))
    invitation = await service_create_invitation(
        email=email,
        organization_id=organization_id,
        inviter_id=user_id,
        role=role.value,
    )

    return Invitation(
        id=str(invitation.get("_id")),
        email=invitation["email"],
        token=invitation["token"],
        organization_id=invitation["organization_id"],
        inviter_id=invitation["inviter_id"],
        role=Role(invitation["role"]),
        expires_at=invitation["expires_at"],
        created_at=invitation["created_at"],
        accepted_at=invitation.get("accepted_at"),
    )


def _mongo_member_to_member_with_user(m: dict) -> MemberWithUser:
    """Convert a MongoDB member doc (with joined user) to MemberWithUser type."""
    user = m.get("user") or {}
    return MemberWithUser(
        id=str(m["_id"]),
        user_id=m["user_id"],
        organization_id=m["organization_id"],
        house_id=m.get("house_id"),
        role=Role(m["role"]),
        created_at=m["created_at"],
        email=user.get("email", ""),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        avatar_url=user.get("avatar_url"),
        house_name=m.get("house", {}).get("name") if m.get("house") else None,
    )


async def resolve_organization_members(
    info: strawberry.types.Info, organization_id: str
) -> List[MemberWithUser]:
    """Resolver for listing all members of an organization."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    members = await service_get_members(organization_id)
    return [_mongo_member_to_member_with_user(m) for m in members]


async def resolve_update_member_role(
    info: strawberry.types.Info, member_id: str, role: Role
) -> MemberWithUser:
    """Resolver for updating a member's role. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    # We need to look up the member to get their org_id for the permission check
    from ..database import db

    if not db.is_connected():
        await db.connect()

    from bson import ObjectId

    member = await db.db.organization_members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise Exception("Member not found")

    await require_org_admin(user, member["organization_id"])

    user_id = user.get("id") or str(user.get("_id"))
    updated = await service_update_role(member_id, role.value, user_id)
    return _mongo_member_to_member_with_user(updated)


async def resolve_create_organization(
    info: strawberry.types.Info, name: str
) -> Organization:
    """Resolver for creating a new organization. Authenticated users only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    org = await service_create_org(name, user_id)

    return Organization(
        id=str(org["_id"]),
        name=org["name"],
        slug=org["slug"],
        created_at=org["created_at"],
        updated_at=org["updated_at"],
    )
