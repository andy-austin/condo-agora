from typing import Any, List, Optional

from ..graphql_types.auth import (
    Organization,
    OrganizationMember,
    Role,
)
from ..graphql_types.house import House
from ..src.house.service import assign_resident_to_house as service_assign_resident
from ..src.house.service import create_house as service_create_house
from ..src.house.service import delete_house as service_delete_house
from ..src.house.service import get_house as service_get_house
from ..src.house.service import get_houses as service_get_houses
from ..src.house.service import remove_resident_from_house as service_remove_resident
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
        created_at=h["created_at"],
        updated_at=h["updated_at"],
        residents=residents,
    )


async def resolve_houses(info: Any, organization_id: str) -> List[House]:
    """Resolver for listing houses in an organization."""
    houses = await service_get_houses(organization_id)
    return [_mongo_house_to_graphql(h) for h in houses]


async def resolve_house(info: Any, id: str) -> Optional[House]:
    """Resolver for getting a single house by ID."""
    house = await service_get_house(id)
    if not house:
        return None
    return _mongo_house_to_graphql(house)


async def resolve_create_house(info: Any, organization_id: str, name: str) -> House:
    """Resolver for creating a new house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    house = await service_create_house(organization_id, name)
    return _mongo_house_to_graphql(house)


async def resolve_update_house(info: Any, id: str, name: str) -> House:
    """Resolver for updating a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    house = await service_update_house(id, name)
    return _mongo_house_to_graphql(house)


async def resolve_delete_house(info: Any, id: str) -> bool:
    """Resolver for deleting a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    return await service_delete_house(id)


async def resolve_assign_resident_to_house(
    info: Any, user_id: str, house_id: str
) -> OrganizationMember:
    """Resolver for assigning a resident to a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    member = await service_assign_resident(user_id, house_id)
    return _mongo_member_to_graphql(member)


async def resolve_remove_resident_from_house(
    info: Any, user_id: str, organization_id: str
) -> OrganizationMember:
    """Resolver for removing a resident from a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    member = await service_remove_resident(user_id, organization_id)
    return _mongo_member_to_graphql(member)
