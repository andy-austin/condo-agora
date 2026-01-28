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


def _prisma_member_to_graphql(m) -> OrganizationMember:
    """Convert a Prisma OrganizationMember to GraphQL type."""
    org = (
        Organization(
            id=m.organization.id,
            name=m.organization.name,
            slug=m.organization.slug,
            created_at=m.organization.createdAt,
            updated_at=m.organization.updatedAt,
        )
        if hasattr(m, "organization") and m.organization
        else None
    )

    return OrganizationMember(
        id=m.id,
        user_id=m.userId,
        organization_id=m.organizationId,
        house_id=m.houseId,
        role=Role(m.role),
        created_at=m.createdAt,
        organization=org,
    )


def _prisma_house_to_graphql(h) -> House:
    """Convert a Prisma House model to GraphQL House type."""
    residents = []
    if hasattr(h, "residents") and h.residents:
        for m in h.residents:
            residents.append(
                OrganizationMember(
                    id=m.id,
                    user_id=m.userId,
                    organization_id=m.organizationId,
                    house_id=m.houseId,
                    role=Role(m.role),
                    created_at=m.createdAt,
                    organization=(
                        Organization(
                            id="",
                            name="",
                            slug="",
                            created_at=m.createdAt,
                            updated_at=m.createdAt,
                        )
                        if not (hasattr(m, "organization") and m.organization)
                        else Organization(
                            id=m.organization.id,
                            name=m.organization.name,
                            slug=m.organization.slug,
                            created_at=m.organization.createdAt,
                            updated_at=m.organization.updatedAt,
                        )
                    ),
                )
            )

    return House(
        id=h.id,
        name=h.name,
        organization_id=h.organizationId,
        created_at=h.createdAt,
        updated_at=h.updatedAt,
        residents=residents,
    )


async def resolve_houses(info: Any, organization_id: str) -> List[House]:
    """Resolver for listing houses in an organization."""
    houses = await service_get_houses(organization_id)
    return [_prisma_house_to_graphql(h) for h in houses]


async def resolve_house(info: Any, id: str) -> Optional[House]:
    """Resolver for getting a single house by ID."""
    house = await service_get_house(id)
    if not house:
        return None
    return _prisma_house_to_graphql(house)


async def resolve_create_house(info: Any, organization_id: str, name: str) -> House:
    """Resolver for creating a new house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    house = await service_create_house(organization_id, name)
    return _prisma_house_to_graphql(house)


async def resolve_update_house(info: Any, id: str, name: str) -> House:
    """Resolver for updating a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    house = await service_update_house(id, name)
    return _prisma_house_to_graphql(house)


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
    return _prisma_member_to_graphql(member)


async def resolve_remove_resident_from_house(
    info: Any, user_id: str, organization_id: str
) -> OrganizationMember:
    """Resolver for removing a resident from a house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    member = await service_remove_resident(user_id, organization_id)
    return _prisma_member_to_graphql(member)
