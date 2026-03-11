import re
from datetime import datetime

from ...database import db
from ..auth.clerk_utils import create_phone_user
from ..auth.service import create_organization

E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")
MAX_ROWS = 200


async def bulk_setup_organization(
    organization_name: str,
    rows: list,
    creator_user_id: str,
) -> dict:
    if len(rows) > MAX_ROWS:
        raise Exception(f"Maximum {MAX_ROWS} rows per batch")

    if not db.is_connected():
        await db.connect()

    org = await create_organization(organization_name, creator_user_id)
    org_id = str(org["_id"])

    now = datetime.utcnow()
    results = []
    total_properties = 0
    total_residents = 0

    for row in rows:
        row_id = row["row_id"]
        property_name = row["property_name"]
        first_name = row.get("first_name")
        last_name = row.get("last_name")
        phone = row.get("phone")

        row_result = {"row_id": row_id, "status": "SUCCESS", "error": None}

        try:
            house_data = {
                "name": property_name,
                "organization_id": org_id,
                "voter_user_id": None,
                "created_at": now,
                "updated_at": now,
            }
            house_insert = await db.db.houses.insert_one(house_data)
            house_id = str(house_insert.inserted_id)
            row_result["property_id"] = house_id
            total_properties += 1

            if phone:
                phone = phone.strip()
                if not E164_REGEX.match(phone):
                    row_result["status"] = "ERROR"
                    row_result["error"] = (
                        f"Invalid phone format: {phone}. "
                        "Expected E.164 format (e.g., +584121234567)"
                    )
                    results.append(row_result)
                    continue

                existing_user = await db.db.users.find_one({"phone_number": phone})

                if existing_user:
                    user_id = str(existing_user["_id"])
                else:
                    clerk_result = await create_phone_user(
                        phone=phone,
                        first_name=first_name,
                        last_name=last_name,
                        metadata={
                            "organization_id": org_id,
                            "house_id": house_id,
                        },
                    )

                    if clerk_result is None:
                        row_result["status"] = "ERROR"
                        row_result["error"] = "Clerk API not configured"
                        results.append(row_result)
                        continue

                    if clerk_result.get("error"):
                        row_result["status"] = "ERROR"
                        row_result["error"] = clerk_result.get("detail", "Clerk error")
                        results.append(row_result)
                        continue

                    clerk_id = clerk_result["id"]

                    local_user = await db.db.users.find_one({"clerk_id": clerk_id})
                    if local_user:
                        user_id = str(local_user["_id"])
                    else:
                        user_doc = {
                            "clerk_id": clerk_id,
                            "email": None,
                            "phone_number": phone,
                            "first_name": first_name,
                            "last_name": last_name,
                            "avatar_url": None,
                            "requires_profile_completion": True,
                            "created_at": now,
                            "updated_at": now,
                        }
                        insert_result = await db.db.users.insert_one(user_doc)
                        user_id = str(insert_result.inserted_id)

                member_data = {
                    "user_id": user_id,
                    "organization_id": org_id,
                    "house_id": house_id,
                    "role": "RESIDENT",
                    "created_at": now,
                    "updated_at": now,
                }
                await db.db.organization_members.insert_one(member_data)

                await db.db.houses.update_one(
                    {"_id": house_insert.inserted_id},
                    {"$set": {"voter_user_id": user_id}},
                )

                row_result["user_id"] = user_id
                total_residents += 1

        except Exception as e:
            row_result["status"] = "ERROR"
            row_result["error"] = str(e)

        results.append(row_result)

    return {
        "organization": org,
        "total_properties": total_properties,
        "total_residents": total_residents,
        "rows": results,
    }
