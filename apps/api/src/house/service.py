from datetime import datetime
from typing import List

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_houses(organization_id: str) -> List:
    """Get all houses for an organization."""
    await _ensure_connected()

    houses = []
    cursor = db.db.houses.find({"organization_id": organization_id}).sort(
        "created_at", 1
    )

    async for house in cursor:
        # Fetch residents for this house
        residents = []
        residents_cursor = db.db.organization_members.find(
            {"house_id": str(house["_id"])}
        )
        async for resident in residents_cursor:
            residents.append(resident)
        house["residents"] = residents
        houses.append(house)

    return houses


async def get_house(house_id: str):
    """Get a single house by ID, including residents."""
    await _ensure_connected()

    try:
        house = await db.db.houses.find_one({"_id": ObjectId(house_id)})
    except Exception:
        return None

    if not house:
        return None

    # Fetch residents
    residents = []
    cursor = db.db.organization_members.find({"house_id": str(house["_id"])})
    async for resident in cursor:
        residents.append(resident)
    house["residents"] = residents

    return house


async def create_house(organization_id: str, name: str):
    """Create a new house within an organization."""
    await _ensure_connected()

    now = datetime.utcnow()
    house_data = {
        "name": name,
        "organization_id": organization_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.db.houses.insert_one(house_data)
    house = await db.db.houses.find_one({"_id": result.inserted_id})
    house["residents"] = []

    return house


async def update_house(house_id: str, name: str):
    """Update a house's name."""
    await _ensure_connected()

    now = datetime.utcnow()
    house = await db.db.houses.find_one_and_update(
        {"_id": ObjectId(house_id)},
        {"$set": {"name": name, "updated_at": now}},
        return_document=True,
    )

    if house:
        # Fetch residents
        residents = []
        cursor = db.db.organization_members.find({"house_id": str(house["_id"])})
        async for resident in cursor:
            residents.append(resident)
        house["residents"] = residents

    return house


async def delete_house(house_id: str) -> bool:
    """
    Delete a house. Fails if the house has residents assigned.
    """
    await _ensure_connected()

    house = await get_house(house_id)
    if not house:
        raise Exception("House not found")

    if house.get("residents") and len(house["residents"]) > 0:
        raise Exception(
            "Cannot delete a house with assigned residents. "
            "Remove all residents first."
        )

    result = await db.db.houses.delete_one({"_id": ObjectId(house_id)})
    return result.deleted_count > 0


async def assign_resident_to_house(user_id: str, house_id: str):
    """
    Assign a user (OrganizationMember) to a house.
    Validates that the house and member belong to the same organization.
    """
    await _ensure_connected()

    try:
        house = await db.db.houses.find_one({"_id": ObjectId(house_id)})
    except Exception:
        house = None

    if not house:
        raise Exception("House not found")

    member = await db.db.organization_members.find_one(
        {
            "user_id": user_id,
            "organization_id": house["organization_id"],
        }
    )
    if not member:
        raise Exception("User is not a member of this organization")

    now = datetime.utcnow()
    updated_member = await db.db.organization_members.find_one_and_update(
        {"_id": member["_id"]},
        {"$set": {"house_id": house_id, "updated_at": now}},
        return_document=True,
    )

    # Fetch organization
    org = await db.db.organizations.find_one(
        {"_id": ObjectId(updated_member["organization_id"])}
    )
    updated_member["organization"] = org

    # Fetch house
    house = await db.db.houses.find_one({"_id": ObjectId(house_id)})
    updated_member["house"] = house

    return updated_member


async def remove_resident_from_house(user_id: str, organization_id: str):
    """
    Remove a resident from their house assignment.
    Sets house_id to None on the OrganizationMember.
    """
    await _ensure_connected()

    member = await db.db.organization_members.find_one(
        {
            "user_id": user_id,
            "organization_id": organization_id,
        }
    )
    if not member:
        raise Exception("User is not a member of this organization")

    if not member.get("house_id"):
        raise Exception("User is not assigned to any house")

    now = datetime.utcnow()
    updated_member = await db.db.organization_members.find_one_and_update(
        {"_id": member["_id"]},
        {"$set": {"house_id": None, "updated_at": now}},
        return_document=True,
    )

    # Fetch organization
    org = await db.db.organizations.find_one(
        {"_id": ObjectId(updated_member["organization_id"])}
    )
    updated_member["organization"] = org
    updated_member["house"] = None

    return updated_member


async def get_houses_count(organization_id: str) -> int:
    """Get the count of houses in an organization."""
    await _ensure_connected()
    return await db.db.houses.count_documents({"organization_id": organization_id})
