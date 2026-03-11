# apps/api/src/auth/invite_router.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ...database import db
from .dependencies import get_current_user

invite_router = APIRouter(prefix="/invite", tags=["invitations"])


@invite_router.post("/{token}/accept")
async def accept_invitation(
    token: str,
    user: dict = Depends(get_current_user),
):
    """Accept an invitation by token. Requires authentication."""
    if not db.is_connected():
        await db.connect()

    invitation = await db.db.invitations.find_one({"token": token})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=400, detail=f"Invitation is {invitation['status']}"
        )

    if invitation["expires_at"] < datetime.now(timezone.utc):
        await db.db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "expired"}},
        )
        raise HTTPException(status_code=410, detail="Invitation expired")

    # Verify identifier matches user
    identifier = invitation["identifier"]
    channel = invitation.get("channel", "email")
    if channel == "whatsapp":
        if user.get("phone") != identifier:
            raise HTTPException(status_code=403, detail="Invitation not for this user")
    else:
        if user.get("email") != identifier:
            raise HTTPException(status_code=403, detail="Invitation not for this user")

    # Check if already a member
    existing = await db.db.organization_members.find_one(
        {
            "organization_id": invitation["organization_id"],
            "user_id": user["_id"],
        }
    )
    if existing:
        await db.db.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "accepted"}},
        )
        return {"status": "accepted", "message": "Already a member"}

    # Create membership
    now = datetime.now(timezone.utc)
    await db.db.organization_members.insert_one(
        {
            "organization_id": invitation["organization_id"],
            "user_id": user["_id"],
            "role": invitation["role"],
            "created_at": now,
            "updated_at": now,
        }
    )

    # Mark invitation as accepted
    await db.db.invitations.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"status": "accepted", "accepted_at": now}},
    )

    return {"status": "accepted", "organization_id": str(invitation["organization_id"])}
