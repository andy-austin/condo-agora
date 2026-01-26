import os
from datetime import datetime
from fastapi import Request, HTTPException
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

    # Extract Svix headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(status_code=400, detail="Missing svix headers")

    wh = Webhook(CLERK_WEBHOOK_SECRET)

    try:
        # Verify and parse the payload
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

    # Ensure DB is connected
    if not db.is_connected():
        await db.connect()

    # Use upsert for idempotency
    user = await db.user.upsert(
        where={"clerkId": clerk_id},
        data={
            "create": {
                "clerkId": clerk_id,
                "email": primary_email,
                "firstName": first_name,
                "lastName": last_name,
                "avatarUrl": image_url,
            },
            "update": {
                "email": primary_email,
                "firstName": first_name,
                "lastName": last_name,
                "avatarUrl": image_url,
            },
        },
    )
    print(f"User {clerk_id} created/synced in local DB")

    # Check for pending invitations matching this email
    invitations = await db.invitation.find_many(
        where={
            "email": primary_email,
            "acceptedAt": None,
            "expiresAt": {"gt": datetime.now()},
        }
    )

    for invite in invitations:
        # Add user to organization
        await db.organizationmember.create(
            data={
                "userId": user.id,
                "organizationId": invite.organizationId,
                "role": invite.role,
            }
        )
        # Mark invitation as accepted
        await db.invitation.update(
            where={"id": invite.id}, data={"acceptedAt": datetime.now()}
        )
        print(
            f"User {clerk_id} auto-joined organization {invite.organizationId} via invitation"
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

    # Ensure DB is connected
    if not db.is_connected():
        await db.connect()

    await db.user.update(
        where={"clerkId": clerk_id},
        data={
            "email": primary_email,
            "firstName": first_name,
            "lastName": last_name,
            "avatarUrl": image_url,
        },
    )
    print(f"User {clerk_id} updated in local DB")
