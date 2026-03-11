# apps/api/src/auth/otp.py
import secrets
import uuid
from datetime import datetime, timezone

from .channels import send_whatsapp_otp, send_email_otp
from .rate_limit import check_rate_limit


class OTPVerificationError(Exception):
    """Raised when OTP verification fails."""
    pass


def generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP code."""
    return f"{secrets.randbelow(1000000):06d}"


async def request_otp(db, identifier: str, channel: str, ip_address: str) -> None:
    """Generate OTP, store it, and send via the specified channel.

    Rate limits:
    - 3 requests per identifier per hour
    - 10 requests per IP per hour
    """
    # Rate limit checks
    await check_rate_limit(
        db, key=f"otp_request:id:{identifier}", max_count=3, window_seconds=3600
    )
    await check_rate_limit(
        db, key=f"otp_request:ip:{ip_address}", max_count=10, window_seconds=3600
    )

    # Delete any existing codes for this identifier
    await db.otp_codes.delete_many({"identifier": identifier})

    # Generate and store new code
    code = generate_otp()
    await db.otp_codes.insert_one({
        "identifier": identifier,
        "code": code,
        "channel": channel,
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })

    # Send via appropriate channel
    if channel == "whatsapp":
        await send_whatsapp_otp(to=identifier, code=code)
    elif channel == "email":
        await send_email_otp(to=identifier, code=code)
    else:
        raise ValueError(f"Unknown channel: {channel}")


async def verify_otp(db, identifier: str, code: str) -> dict:
    """Verify OTP code. Returns user dict (creates user if new).

    Raises OTPVerificationError on failure.
    """
    otp_doc = await db.otp_codes.find_one({"identifier": identifier})

    if not otp_doc:
        raise OTPVerificationError("No active code for this identifier")

    # Check max attempts (3)
    if otp_doc["attempts"] >= 2:
        await db.otp_codes.delete_one({"_id": otp_doc["_id"]})
        raise OTPVerificationError("Too many attempts. Request a new code.")

    # Check code match
    if otp_doc["code"] != code:
        await db.otp_codes.update_one(
            {"_id": otp_doc["_id"]},
            {"$inc": {"attempts": 1}},
        )
        raise OTPVerificationError("Invalid code")

    # Code is correct — delete it
    await db.otp_codes.delete_one({"_id": otp_doc["_id"]})

    # Find or create user
    is_phone = identifier.startswith("+")
    lookup_field = "phone" if is_phone else "email"
    user = await db.users.find_one({lookup_field: identifier})

    if not user:
        now = datetime.now(timezone.utc)
        new_user = {
            "nextauth_id": str(uuid.uuid4()),
            "email": None if is_phone else identifier,
            "phone": identifier if is_phone else None,
            "first_name": None,
            "last_name": None,
            "avatar_url": None,
            "auth_provider": "phone" if is_phone else "email",
            "created_at": now,
            "updated_at": now,
        }
        result = await db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user

    return user
