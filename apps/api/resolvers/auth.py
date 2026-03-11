from typing import List, Optional

import strawberry

from ..graphql_types.auth import (
    Invitation,
    InvitationMethod,
    MemberWithUser,
    Organization,
    OrganizationMember,
    Role,
    User,
)
from ..graphql_types.house import House
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.auth.service import accept_invitation_by_id as service_accept_invitation
from ..src.auth.service import create_invitation as service_create_invitation
from ..src.auth.service import create_organization as service_create_org
from ..src.auth.service import get_organization_members as service_get_members
from ..src.auth.service import get_pending_invitations as service_get_pending
from ..src.auth.service import (
    get_user_with_memberships,
)
from ..src.auth.service import remove_member_from_organization as service_remove_member
from ..src.auth.service import resend_invitation as service_resend_invitation
from ..src.auth.service import revoke_invitation as service_revoke_invitation
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


def _mongo_invitation_to_graphql(inv: dict) -> Invitation:
    """Convert a MongoDB invitation doc to GraphQL Invitation type."""
    method_val = inv.get("method", "EMAIL")
    return Invitation(
        id=str(inv["_id"]),
        email=inv["email"],
        organization_id=inv["organization_id"],
        inviter_id=inv["inviter_id"],
        role=Role(inv["role"]),
        method=InvitationMethod(method_val),
        expires_at=inv["expires_at"],
        created_at=inv["created_at"],
        accepted_at=inv.get("accepted_at"),
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
    """Resolver for creating an invitation."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    user_id = user.get("id") or str(user.get("_id"))
    invitation = await service_create_invitation(
        email=email,
        organization_id=organization_id,
        inviter_id=user_id,
        role=role.value,
    )

    return _mongo_invitation_to_graphql(invitation)


async def resolve_pending_invitations(
    info: strawberry.types.Info, organization_id: str
) -> List[Invitation]:
    """Resolver for listing pending invitations. Admin only."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    invitations = await service_get_pending(organization_id)
    return [_mongo_invitation_to_graphql(inv) for inv in invitations]


async def resolve_accept_invitation(
    info: strawberry.types.Info, invitation_id: str
) -> Invitation:
    """Resolver for accepting an invitation. Authenticated users only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    invitation = await service_accept_invitation(invitation_id, user_id)
    return _mongo_invitation_to_graphql(invitation)


async def resolve_revoke_invitation(
    info: strawberry.types.Info, invitation_id: str
) -> bool:
    """Resolver for revoking a pending invitation. Admin only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    # Check admin permission before revoking
    from ..database import db

    if not db.is_connected():
        await db.connect()

    from bson import ObjectId

    inv = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise Exception("Invitation not found")

    await require_org_admin(user, inv["organization_id"])

    await service_revoke_invitation(invitation_id)
    return True


async def resolve_resend_invitation(
    info: strawberry.types.Info, invitation_id: str
) -> Invitation:
    """Resolver for resending a pending invitation. Admin only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    # Get invitation to check org admin
    from ..database import db

    if not db.is_connected():
        await db.connect()

    from bson import ObjectId

    inv = await db.db.invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise Exception("Invitation not found")

    await require_org_admin(user, inv["organization_id"])

    updated = await service_resend_invitation(invitation_id)
    return _mongo_invitation_to_graphql(updated)


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
    """Resolver for listing all members of an organization. MEMBER only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    await require_org_member(user, organization_id)
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


async def resolve_remove_member(info: strawberry.types.Info, member_id: str) -> bool:
    """Resolver for removing a member from an organization. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    from ..database import db

    if not db.is_connected():
        await db.connect()

    from bson import ObjectId

    member = await db.db.organization_members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise Exception("Member not found")

    await require_org_admin(user, member["organization_id"])

    user_id = user.get("id") or str(user.get("_id"))
    await service_remove_member(member_id, user_id)
    return True


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
