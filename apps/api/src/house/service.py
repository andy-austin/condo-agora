from typing import List, Optional

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_houses(organization_id: str) -> List:
    """Get all houses for an organization."""
    await _ensure_connected()
    return await db.house.find_many(
        where={"organizationId": organization_id},
        include={"residents": True},
        order={"createdAt": "asc"},
    )


async def get_house(house_id: str):
    """Get a single house by ID, including residents."""
    await _ensure_connected()
    return await db.house.find_unique(
        where={"id": house_id},
        include={"residents": True},
    )


async def create_house(organization_id: str, name: str):
    """Create a new house within an organization."""
    await _ensure_connected()
    return await db.house.create(
        data={
            "name": name,
            "organizationId": organization_id,
        },
        include={"residents": True},
    )


async def update_house(house_id: str, name: str):
    """Update a house's name."""
    await _ensure_connected()
    return await db.house.update(
        where={"id": house_id},
        data={"name": name},
        include={"residents": True},
    )


async def delete_house(house_id: str) -> bool:
    """
    Delete a house. Fails if the house has residents assigned.
    """
    await _ensure_connected()

    house = await db.house.find_unique(
        where={"id": house_id},
        include={"residents": True},
    )
    if not house:
        raise Exception("House not found")

    if house.residents and len(house.residents) > 0:
        raise Exception(
            "Cannot delete a house with assigned residents. "
            "Remove all residents first."
        )

    await db.house.delete(where={"id": house_id})
    return True


async def assign_resident_to_house(user_id: str, house_id: str):
    """
    Assign a user (OrganizationMember) to a house.
    Validates that the house and member belong to the same organization.
    """
    await _ensure_connected()

    house = await db.house.find_unique(where={"id": house_id})
    if not house:
        raise Exception("House not found")

    member = await db.organizationmember.find_first(
        where={
            "userId": user_id,
            "organizationId": house.organizationId,
        }
    )
    if not member:
        raise Exception("User is not a member of this organization")

    return await db.organizationmember.update(
        where={"id": member.id},
        data={"houseId": house_id},
        include={"organization": True, "house": True},
    )


async def remove_resident_from_house(user_id: str, organization_id: str):
    """
    Remove a resident from their house assignment.
    Sets houseId to None on the OrganizationMember.
    """
    await _ensure_connected()

    member = await db.organizationmember.find_first(
        where={
            "userId": user_id,
            "organizationId": organization_id,
        }
    )
    if not member:
        raise Exception("User is not a member of this organization")

    if not member.houseId:
        raise Exception("User is not assigned to any house")

    return await db.organizationmember.update(
        where={"id": member.id},
        data={"houseId": None},
        include={"organization": True, "house": True},
    )


async def get_houses_count(organization_id: str) -> int:
    """Get the count of houses in an organization."""
    await _ensure_connected()
    return await db.house.count(
        where={"organizationId": organization_id}
    )
