from typing import List, Optional

import strawberry

from ..graphql_types.auth import (
    Organization,
    OrganizationMember,
    Role,
)
from ..graphql_types.house import House
from ..src.auth.permissions import (
    get_org_id_for_house,
    require_org_admin,
    require_org_member,
)
from ..src.house.service import assign_resident_to_house as service_assign_resident
from ..src.house.service import create_house as service_create_house
from ..src.house.service import delete_house as service_delete_house
from ..src.house.service import get_house as service_get_house
from ..src.house.service import get_houses as service_get_houses
from ..src.house.service import remove_resident_from_house as service_remove_resident
from ..src.house.service import set_house_voter as service_set_house_voter
from ..src.house.service import update_house as service_update_house


def _mongo_member_to_graphql(m: dict) -> OrganizationMember:
    """Convert a MongoDB OrganizationMember document to GraphQL type."""
    org = None
    if m.get("organization"):
        o = m["organization"]
        org = Organization(
            id=str(o["_id"]),
            name=o["name"],
            slug=o["slug"],
            created_at=o["created_at"],
            updated_at=o["updated_at"],
        )

    house = None
    if m.get("house"):
        h = m["house"]
        house = House(
            id=str(h["_id"]),
            name=h["name"],
            organization_id=h["organization_id"],
            created_at=h["created_at"],
            updated_at=h["updated_at"],
        )

    return OrganizationMember(
        id=str(m["_id"]),
        user_id=m["user_id"],
        organization_id=m["organization_id"],
        house_id=m.get("house_id"),
        role=Role(m["role"]),
        created_at=m["created_at"],
        organization=org,
        house=house,
    )


def _mongo_house_to_graphql(h: dict) -> House:
    """Convert a MongoDB House document to GraphQL House type."""
    residents = []
    if h.get("residents"):
        for m in h["residents"]:
            residents.append(
                OrganizationMember(
                    id=str(m["_id"]),
                    user_id=m["user_id"],
                    organization_id=m["organization_id"],
                    house_id=m.get("house_id"),
                    role=Role(m["role"]),
                    created_at=m["created_at"],
                    organization=(
                        Organization(
                            id="",
                            name="",
                            slug="",
                            created_at=m["created_at"],
                            updated_at=m["created_at"],
                        )
                        if not m.get("organization")
                        else Organization(
                            id=str(m["organization"]["_id"]),
                            name=m["organization"]["name"],
                            slug=m["organization"]["slug"],
                            created_at=m["organization"]["created_at"],
                            updated_at=m["organization"]["updated_at"],
                        )
                    ),
                )
            )

    return House(
        id=str(h["_id"]),
        name=h["name"],
        organization_id=h["organization_id"],
        voter_user_id=h.get("voter_user_id"),
        created_at=h["created_at"],
        updated_at=h["updated_at"],
        residents=residents,
    )


async def resolve_houses(
    info: strawberry.types.Info, organization_id: str
) -> List[House]:
    """Resolver for listing houses in an organization."""
    user = info.context.get("user")
    if user:
        await require_org_member(user, organization_id)

    houses = await service_get_houses(organization_id)
    return [_mongo_house_to_graphql(h) for h in houses]


async def resolve_house(info: strawberry.types.Info, id: str) -> Optional[House]:
    """Resolver for getting a single house by ID. MEMBER only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    house = await service_get_house(id)
    if not house:
        return None

    await require_org_member(user, house["organization_id"])
    return _mongo_house_to_graphql(house)


async def resolve_create_house(
    info: strawberry.types.Info, organization_id: str, name: str
) -> House:
    """Resolver for creating a new house. ADMIN only."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    house = await service_create_house(organization_id, name)
    return _mongo_house_to_graphql(house)


async def resolve_update_house(
    info: strawberry.types.Info, id: str, name: str
) -> House:
    """Resolver for updating a house. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    org_id = await get_org_id_for_house(id)
    if not org_id:
        raise Exception("House not found")
    await require_org_admin(user, org_id)

    house = await service_update_house(id, name)
    return _mongo_house_to_graphql(house)


async def resolve_delete_house(info: strawberry.types.Info, id: str) -> bool:
    """Resolver for deleting a house. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    org_id = await get_org_id_for_house(id)
    if not org_id:
        raise Exception("House not found")
    await require_org_admin(user, org_id)

    return await service_delete_house(id)


async def resolve_assign_resident_to_house(
    info: strawberry.types.Info, user_id: str, house_id: str
) -> OrganizationMember:
    """Resolver for assigning a resident to a house. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    org_id = await get_org_id_for_house(house_id)
    if not org_id:
        raise Exception("House not found")
    await require_org_admin(user, org_id)

    member = await service_assign_resident(user_id, house_id)
    return _mongo_member_to_graphql(member)


async def resolve_remove_resident_from_house(
    info: strawberry.types.Info, user_id: str, organization_id: str
) -> OrganizationMember:
    """Resolver for removing a resident from a house. ADMIN only."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)

    member = await service_remove_resident(user_id, organization_id)
    return _mongo_member_to_graphql(member)


async def resolve_set_house_voter(
    info: strawberry.types.Info, house_id: str, target_user_id: str
) -> House:
    """Resolver for setting the designated voter. Admin or house resident."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    org_id = await get_org_id_for_house(house_id)
    if not org_id:
        raise Exception("House not found")

    user_id = user.get("id") or str(user.get("_id"))
    role = await require_org_member(user, org_id)

    # Allow if admin OR if caller is a resident of this house
    if role != "ADMIN":
        from ..database import db

        caller_member = await db.db.organization_members.find_one(
            {"user_id": user_id, "house_id": house_id}
        )
        if not caller_member:
            raise Exception(
                "Only administrators or house residents can change the voter"
            )

    house = await service_set_house_voter(house_id, target_user_id)
    return _mongo_house_to_graphql(house)
