import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...database import db
from .utils import verify_token

logger = logging.getLogger(__name__)

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credential: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and verify JWT from Authorization header. Returns user dict."""
    try:
        payload = await verify_token(credential.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    nextauth_id = payload.get("sub")
    if not nextauth_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    if not db.is_connected():
        await db.connect()

    user = await db.db.users.find_one({"nextauth_id": nextauth_id})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user["id"] = str(user["_id"])
    return user


async def get_current_user_optional(
    credential: HTTPAuthorizationCredentials | None = Depends(security_optional),
) -> dict | None:
    """Same as get_current_user but returns None instead of raising."""
    if credential is None:
        logger.warning("GraphQL request with no Authorization header")
        return None
    try:
        return await get_current_user(credential=credential)
    except HTTPException as e:
        logger.warning("Auth failed for GraphQL request: %s", e.detail)
        return None
