# apps/api/src/auth/otp_router.py
import os
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
