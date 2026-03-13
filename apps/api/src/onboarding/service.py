import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

from ...database import db
from ..auth.channels import send_email_invitation, send_whatsapp_invitation
from ..auth.service import create_organization

logger = logging.getLogger(__name__)

E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")
EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
MAX_ROWS = 200
BASE_URL = os.environ.get("NEXTAUTH_URL", "http://localhost:3000")


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
    org_name = org["name"]

    now = datetime.utcnow()
    results = []
    total_properties = 0
    total_residents = 0
    whatsapp_sent = 0
    email_sent = 0
    no_contact_count = 0

    for row in rows:
        row_id = row["row_id"]
        property_name = row["property_name"]
        first_name = row.get("first_name")
        last_name = row.get("last_name")
        phone = row.get("phone")
        email = row.get("email")

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

            user_id = None

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
                        "email": email,
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

            elif email:
                email = email.strip()
                if not re.match(EMAIL_REGEX, email):
                    row_result["status"] = "ERROR"
                    row_result["error"] = f"Invalid email format: {email}"
                    results.append(row_result)
                    continue

                existing_user = await db.db.users.find_one({"email": email})

                if existing_user:
                    user_id = str(existing_user["_id"])
                else:
                    user_doc = {
                        "nextauth_id": None,
                        "email": email,
                        "phone": None,
                        "auth_provider": "email",
                        "first_name": first_name,
                        "last_name": last_name,
                        "avatar_url": None,
                        "requires_profile_completion": True,
                        "created_at": now,
                        "updated_at": now,
                    }
                    insert_result = await db.db.users.insert_one(user_doc)
                    user_id = str(insert_result.inserted_id)

            if user_id:
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

                # Create invitation and send via available channels
                token = str(uuid.uuid4())
                invite_url = f"{BASE_URL}/invite/{token}"
                expires_at = now + timedelta(days=7)

                invitation_doc = {
                    "token": token,
                    "email": email,
                    "phone": phone,
                    "organization_id": org_id,
                    "house_id": house_id,
                    "inviter_id": creator_user_id,
                    "role": "RESIDENT",
                    "method": "bulk_setup",
                    "expires_at": expires_at,
                    "created_at": now,
                    "updated_at": now,
                }
                await db.db.invitations.insert_one(invitation_doc)

                if phone:
                    try:
                        await send_whatsapp_invitation(phone, org_name, invite_url)
                        whatsapp_sent += 1
                    except Exception as e:
                        logger.warning(
                            "Failed to send WhatsApp invitation to %s: %s",
                            phone,
                            e,
                        )

                if email:
                    try:
                        await send_email_invitation(email, org_name, invite_url)
                        email_sent += 1
                    except Exception as e:
                        logger.warning(
                            "Failed to send email invitation to %s: %s",
                            email,
                            e,
                        )
            else:
                # No phone and no email — property without contact
                no_contact_count += 1

        except Exception as e:
            row_result["status"] = "ERROR"
            row_result["error"] = str(e)

        results.append(row_result)

    return {
        "organization": org,
        "total_properties": total_properties,
        "total_residents": total_residents,
        "whatsapp_invitations_sent": whatsapp_sent,
        "email_invitations_sent": email_sent,
        "properties_without_contact": no_contact_count,
        "rows": results,
    }
