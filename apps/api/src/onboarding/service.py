import re
from datetime import datetime

from ...database import db
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

                existing_user = await db.db.users.find_one({"phone": phone})

                if existing_user:
                    user_id = str(existing_user["_id"])
                else:
                    # Create a local user record; the user will complete
                    # authentication via OTP when they first log in.
                    user_doc = {
                        "nextauth_id": None,
                        "email": None,
                        "phone": phone,
                        "auth_provider": "phone",
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
