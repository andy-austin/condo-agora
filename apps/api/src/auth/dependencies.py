import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...database import db
from .utils import verify_clerk_token

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def _provision_user_from_clerk(clerk_id: str) -> Optional[dict]:
    """
    Just-in-time user provisioning: fetch user from Clerk API and create
    a local MongoDB record. This handles cases where the webhook didn't fire
    or there was a race condition.
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not set, cannot provision user")
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_id}",
                headers={
                    "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        print(f"Failed to fetch user {clerk_id} from Clerk API: {e}")
        return None

    email_addresses = data.get("email_addresses", [])
    primary_email_id = data.get("primary_email_address_id")
    primary_email = next(
        (e["email_address"] for e in email_addresses if e["id"] == primary_email_id),
        email_addresses[0]["email_address"] if email_addresses else None,
    )

    if not primary_email:
        print(f"Warning: No email found for Clerk user {clerk_id}")
        return None

    now = datetime.utcnow()
    user_data = {
        "clerk_id": clerk_id,
        "email": primary_email,
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "avatar_url": data.get("image_url"),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.db.users.insert_one(user_data)
    user = await db.db.users.find_one({"_id": result.inserted_id})
    print(f"JIT provisioned user {clerk_id} in local DB")

    # Check for pending invitations matching this email (mirrors webhooks.py logic)
    inv_cursor = db.db.invitations.find(
        {
            "email": primary_email,
            "accepted_at": None,
            "expires_at": {"$gt": now},
        }
    )
    async for invite in inv_cursor:
        # Guard against duplicates if webhook also fires
        existing_member = await db.db.organization_members.find_one(
            {
                "user_id": str(user["_id"]),
                "organization_id": invite["organization_id"],
            }
        )
        if existing_member:
            continue

        member_data = {
            "user_id": str(user["_id"]),
            "organization_id": invite["organization_id"],
            "role": invite["role"],
            "house_id": invite.get("house_id"),
            "created_at": now,
            "updated_at": now,
        }
        await db.db.organization_members.insert_one(member_data)

        await db.db.invitations.update_one(
            {"_id": invite["_id"]},
            {"$set": {"accepted_at": now, "updated_at": now}},
        )
        print(
            f"JIT: User {clerk_id} auto-joined org "
            f"{invite['organization_id']} via invitation"
        )

    return user


async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    """
    Dependency to get the current authenticated user by validating the Clerk JWT.
    Raises 401 if not authenticated.
    """
    token = auth.credentials
    payload = await verify_clerk_token(token)

    clerk_id = payload.get("sub")
    if not clerk_id:
        raise HTTPException(
            status_code=401, detail="Invalid token payload: missing sub"
        )

    if not db.is_connected():
        await db.connect()

    user = await db.db.users.find_one({"clerk_id": clerk_id})

    if not user:
        # JIT provisioning: webhook may not have fired yet
        user = await _provision_user_from_clerk(clerk_id)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="User record not found. Identity sync may be in progress.",
            )

    # Convert ObjectId to string for the id field
    user["id"] = str(user["_id"])
    return user


async def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_optional),
):
    """
    Optional auth dependency - returns user if authenticated, None otherwise.
    Use this for endpoints that work with or without authentication.
    """
    if not auth:
        return None

    try:
        token = auth.credentials
        payload = await verify_clerk_token(token)

        clerk_id = payload.get("sub")
        if not clerk_id:
            return None

        if not db.is_connected():
            await db.connect()

        user = await db.db.users.find_one({"clerk_id": clerk_id})
        if not user:
            # JIT provisioning: webhook may not have fired yet
            user = await _provision_user_from_clerk(clerk_id)
        if user:
            user["id"] = str(user["_id"])
        return user
    except Exception as e:
        print(f"Auth Error in optional dependency: {e}")
        return None
