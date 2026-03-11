import os

import jwt

NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "")


async def verify_token(token: str, secret: str | None = None) -> dict:
    """Verify a NextAuth JWT token (HS256).

    Args:
        token: The JWT string from Authorization header
        secret: The NEXTAUTH_SECRET. Defaults to env var.

    Returns:
        The decoded JWT payload.

    Raises:
        jwt.InvalidTokenError on any verification failure.
    """
    signing_secret = secret or NEXTAUTH_SECRET
    payload = jwt.decode(
        token,
        signing_secret,
        algorithms=["HS256"],
    )
    return payload
