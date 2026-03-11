# apps/api/src/auth/otp_router.py
import os
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from ...database import db
from .otp import OTPVerificationError, request_otp, verify_otp
from .rate_limit import RateLimitExceeded

router = APIRouter(prefix="/otp")

INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")


class OTPRequestBody(BaseModel):
    identifier: str
    channel: Literal["whatsapp", "email"]


class OTPVerifyBody(BaseModel):
    identifier: str
    code: str


@router.post("/request")
async def request_otp_endpoint(body: OTPRequestBody, request: Request):
    """Request an OTP code sent via the specified channel.

    Public endpoint — rate limited per identifier (3/hr) and per IP (10/hr).
    """
    if not db.is_connected():
        await db.connect()

    # Extract client IP, respecting X-Forwarded-For from proxies/Vercel
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else "unknown"

    try:
        await request_otp(
            db=db.db,
            identifier=body.identifier,
            channel=body.channel,
            ip_address=ip_address,
        )
    except RateLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"DEBUG: {type(exc).__name__}: {exc}")
    return {"message": "Code sent"}


@router.post("/verify")
async def verify_otp_endpoint(
    body: OTPVerifyBody,
    x_internal_secret: str = Header(default="", alias="X-Internal-Secret"),
):
    """Verify an OTP code. Server-to-server only, protected by shared secret.

    Returns the user dict on success.
    """
    if not INTERNAL_API_SECRET or x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not db.is_connected():
        await db.connect()

    try:
        user = await verify_otp(db=db.db, identifier=body.identifier, code=body.code)
    except OTPVerificationError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    # Serialize ObjectId fields to strings
    if "_id" in user:
        user["_id"] = str(user["_id"])

    return user


class GoogleLinkBody(BaseModel):
    email: str
    name: str | None = None
    image: str | None = None


@router.post("/google-link")
async def handle_google_link(body: GoogleLinkBody, request: Request):
    """Server-to-server: find or create user for Google sign-in."""
    secret = request.headers.get("X-Internal-Secret", "")
    if secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not db.is_connected():
        await db.connect()

    user = await db.db.users.find_one({"email": body.email})

    if user:
        # Update avatar if missing
        updates = {}
        if not user.get("avatar_url") and body.image:
            updates["avatar_url"] = body.image
        if updates:
            await db.db.users.update_one({"_id": user["_id"]}, {"$set": updates})
            user.update(updates)
    else:
        now = datetime.now(timezone.utc)
        name_parts = (body.name or "").split(" ", 1)
        new_user = {
            "nextauth_id": str(uuid.uuid4()),
            "email": body.email,
            "phone": None,
            "first_name": name_parts[0] if name_parts else None,
            "last_name": name_parts[1] if len(name_parts) > 1 else None,
            "avatar_url": body.image,
            "auth_provider": "google",
            "created_at": now,
            "updated_at": now,
        }
        result = await db.db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user

    user["_id"] = str(user["_id"])
    return user
