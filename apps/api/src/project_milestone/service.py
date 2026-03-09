from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db

VALID_STATUSES = {"PENDING", "IN_PROGRESS", "COMPLETED"}


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_milestones(proposal_id: str) -> List[dict]:
    """Get all milestones for a proposal."""
    await _ensure_connected()
    milestones = []
    cursor = db.db.project_milestones.find({"proposal_id": proposal_id}).sort(
        "created_at", 1
    )
    async for milestone in cursor:
        milestones.append(milestone)
    return milestones


async def get_milestone(milestone_id: str) -> Optional[dict]:
    """Get a single milestone by ID."""
    await _ensure_connected()
    try:
        return await db.db.project_milestones.find_one({"_id": ObjectId(milestone_id)})
    except Exception:
        return None


async def create_milestone(
    proposal_id: str,
    title: str,
    description: str,
    created_by: str,
    due_date: Optional[datetime] = None,
) -> dict:
    """Create a project milestone."""
    await _ensure_connected()

    now = datetime.utcnow()
    data = {
        "proposal_id": proposal_id,
        "title": title,
        "description": description,
        "status": "PENDING",
        "due_date": due_date,
        "completed_at": None,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.db.project_milestones.insert_one(data)
    return await db.db.project_milestones.find_one({"_id": result.inserted_id})


async def update_milestone_status(
    milestone_id: str,
    status: str,
) -> dict:
    """Update the status of a milestone."""
    await _ensure_connected()

    if status not in VALID_STATUSES:
        raise Exception(f"Invalid status. Allowed: {VALID_STATUSES}")

    now = datetime.utcnow()
    update_fields: dict = {"status": status, "updated_at": now}
    if status == "COMPLETED":
        update_fields["completed_at"] = now

    updated = await db.db.project_milestones.find_one_and_update(
        {"_id": ObjectId(milestone_id)},
        {"$set": update_fields},
        return_document=True,
    )
    if not updated:
        raise Exception("Milestone not found")
    return updated


async def delete_milestone(milestone_id: str) -> bool:
    """Delete a milestone."""
    await _ensure_connected()
    try:
        result = await db.db.project_milestones.delete_one(
            {"_id": ObjectId(milestone_id)}
        )
        return result.deleted_count > 0
    except Exception:
        return False


async def get_active_projects(organization_id: str) -> List[dict]:
    """Get proposals in IN_PROGRESS status with milestone progress."""
    await _ensure_connected()

    proposals = []
    cursor = db.db.proposals.find(
        {"organization_id": organization_id, "status": "IN_PROGRESS"}
    ).sort("updated_at", -1)

    async for proposal in cursor:
        proposal_id = str(proposal["_id"])
        total = await db.db.project_milestones.count_documents(
            {"proposal_id": proposal_id}
        )
        completed = await db.db.project_milestones.count_documents(
            {"proposal_id": proposal_id, "status": "COMPLETED"}
        )
        proposal["_milestone_total"] = total
        proposal["_milestone_completed"] = completed
        proposals.append(proposal)

    return proposals
