"""
Migration script: Populate voter_user_id on house documents.

For each house:
  - If exactly 1 resident -> set that user as voter_user_id
  - If 0 or 2+ residents -> leave voter_user_id as None
  - Unset max_residents from all house documents

Usage:
    cd apps/api && python scripts/migrate_voter.py

Requires MONGODB_URI env var to be set.
"""

import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "condo_agora")


async def migrate():
    if not MONGODB_URI:
        print("ERROR: MONGODB_URI environment variable is required")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]

    houses_cursor = db.houses.find({})
    total = 0
    voters_set = 0
    max_residents_removed = 0

    async for house in houses_cursor:
        total += 1
        house_id = str(house["_id"])

        # Count residents assigned to this house
        residents = []
        async for member in db.organization_members.find({"house_id": house_id}):
            residents.append(member)

        updates = {}

        # Set voter if exactly 1 resident and no voter already set
        if len(residents) == 1 and not house.get("voter_user_id"):
            updates["voter_user_id"] = residents[0]["user_id"]
            voters_set += 1

        # Always ensure voter_user_id field exists
        if "voter_user_id" not in house and "voter_user_id" not in updates:
            updates["voter_user_id"] = None

        unset_fields = {}
        if "max_residents" in house:
            unset_fields["max_residents"] = ""
            max_residents_removed += 1

        update_op = {}
        if updates:
            update_op["$set"] = updates
        if unset_fields:
            update_op["$unset"] = unset_fields

        if update_op:
            await db.houses.update_one({"_id": house["_id"]}, update_op)

    print("Migration complete:")
    print(f"  Total houses processed: {total}")
    print(f"  Voters auto-assigned: {voters_set}")
    print(f"  max_residents fields removed: {max_residents_removed}")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
