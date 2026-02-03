from typing import Optional

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...database import db
from .utils import verify_clerk_token

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


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
        if user:
            user["id"] = str(user["_id"])
        return user
    except Exception as e:
        print(f"Auth Error in optional dependency: {e}")
        return None
