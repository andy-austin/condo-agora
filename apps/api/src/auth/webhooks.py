import os
from datetime import datetime

from fastapi import HTTPException, Request
from svix.webhooks import Webhook, WebhookVerificationError

from ...database import db

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")


async def verify_clerk_webhook(request: Request):
    """
    Verifies the Clerk webhook signature using svix.
    """
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=500, detail="CLERK_WEBHOOK_SECRET is not configured"
        )

    payload = await request.body()
    headers = request.headers

    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(status_code=400, detail="Missing svix headers")

    wh = Webhook(CLERK_WEBHOOK_SECRET)

    try:
        msg = wh.verify(
            payload.decode(),
            {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            },
        )
        return msg
    except WebhookVerificationError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid webhook signature: {str(e)}"
        )


async def handle_user_created(data: dict):
    """
    Syncs a newly created Clerk user to our local database.
    """
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")

    primary_email = next(
        (e["email_address"] for e in email_addresses if e["id"] == primary_email_id),
        email_addresses[0]["email_address"] if email_addresses else None,
    )

    if not primary_email:
        print(f"Warning: No email found for Clerk user {clerk_id}")
        return

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    image_url = data.get("image_url")

    if not db.is_connected():
        await db.connect()

    now = datetime.utcnow()

    # Upsert user - find by clerk_id, update or create
    existing_user = await db.db.users.find_one({"clerk_id": clerk_id})

    if existing_user:
        await db.db.users.update_one(
            {"clerk_id": clerk_id},
            {
                "$set": {
                    "email": primary_email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "avatar_url": image_url,
                    "updated_at": now,
                }
            },
        )
        user = await db.db.users.find_one({"clerk_id": clerk_id})
    else:
        user_data = {
            "clerk_id": clerk_id,
            "email": primary_email,
            "first_name": first_name,
            "last_name": last_name,
            "avatar_url": image_url,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.db.users.insert_one(user_data)
        user = await db.db.users.find_one({"_id": result.inserted_id})

    print(f"User {clerk_id} created/synced in local DB")

    # Check for pending invitations matching this email
    cursor = db.db.invitations.find(
        {
            "email": primary_email,
            "accepted_at": None,
            "expires_at": {"$gt": now},
        }
    )

    async for invite in cursor:
        # Add user to organization
        member_data = {
            "user_id": str(user["_id"]),
            "organization_id": invite["organization_id"],
            "role": invite["role"],
            "house_id": invite.get("house_id"),
            "created_at": now,
            "updated_at": now,
        }
        await db.db.organization_members.insert_one(member_data)

        # Mark invitation as accepted
        await db.db.invitations.update_one(
            {"_id": invite["_id"]}, {"$set": {"accepted_at": now, "updated_at": now}}
        )
        print(
            f"User {clerk_id} auto-joined organization {invite['organization_id']} via invitation"
        )


async def handle_user_updated(data: dict):
    """
    Updates an existing user in our local database when changed in Clerk.
    """
    clerk_id = data.get("id")
    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")

    primary_email = next(
        (e["email_address"] for e in email_addresses if e["id"] == primary_email_id),
        email_addresses[0]["email_address"] if email_addresses else None,
    )

    first_name = data.get("first_name")
    last_name = data.get("last_name")
    image_url = data.get("image_url")

    if not db.is_connected():
        await db.connect()

    await db.db.users.update_one(
        {"clerk_id": clerk_id},
        {
            "$set": {
                "email": primary_email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": image_url,
                "updated_at": datetime.utcnow(),
            }
        },
    )
    print(f"User {clerk_id} updated in local DB")
