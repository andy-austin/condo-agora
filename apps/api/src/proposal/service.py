from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db

# Valid status transitions
VALID_TRANSITIONS = {
    "DRAFT": ["OPEN"],
    "OPEN": ["VOTING", "REJECTED"],
    "VOTING": ["APPROVED", "REJECTED"],
    "APPROVED": ["IN_PROGRESS"],
    "IN_PROGRESS": ["COMPLETED"],
    "COMPLETED": [],
    "REJECTED": [],
}


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_proposals(
    organization_id: str,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[dict]:
    """Get all proposals for an organization with optional filters."""
    await _ensure_connected()

    query: dict = {"organization_id": organization_id}
    if status:
        query["status"] = status
    if category:
        query["category"] = category

    proposals = []
    cursor = db.db.proposals.find(query).sort("created_at", -1)
    async for proposal in cursor:
        proposals.append(proposal)

    return proposals


async def get_proposal(proposal_id: str) -> Optional[dict]:
    """Get a single proposal by ID."""
    await _ensure_connected()

    try:
        proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    except Exception:
        return None

    return proposal


async def create_proposal(
    organization_id: str,
    title: str,
    description: str,
    category: str,
    author_id: str,
    status: str = "DRAFT",
) -> dict:
    """Create a new proposal."""
    await _ensure_connected()

    now = datetime.utcnow()
    proposal_data = {
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "author_id": author_id,
        "organization_id": organization_id,
        "responsible_house_id": None,
        "rejection_reason": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.db.proposals.insert_one(proposal_data)
    proposal = await db.db.proposals.find_one({"_id": result.inserted_id})
    return proposal


async def update_proposal(
    proposal_id: str,
    title: str,
    description: str,
    category: str,
) -> Optional[dict]:
    """Update a proposal's content (author only, while DRAFT)."""
    await _ensure_connected()

    now = datetime.utcnow()
    proposal = await db.db.proposals.find_one_and_update(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "title": title,
                "description": description,
                "category": category,
                "updated_at": now,
            }
        },
        return_document=True,
    )
    return proposal


async def update_proposal_status(
    proposal_id: str,
    new_status: str,
    rejection_reason: Optional[str] = None,
    responsible_house_id: Optional[str] = None,
) -> dict:
    """Update the status of a proposal with transition validation."""
    await _ensure_connected()

    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    current_status = proposal["status"]
    allowed_next = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_next:
        raise Exception(
            f"Cannot transition from {current_status} to {new_status}. "
            f"Allowed transitions: {allowed_next}"
        )

    now = datetime.utcnow()
    update_fields: dict = {"status": new_status, "updated_at": now}

    if rejection_reason is not None:
        update_fields["rejection_reason"] = rejection_reason
    if responsible_house_id is not None:
        update_fields["responsible_house_id"] = responsible_house_id

    updated = await db.db.proposals.find_one_and_update(
        {"_id": ObjectId(proposal_id)},
        {"$set": update_fields},
        return_document=True,
    )
    return updated


async def assign_responsible_house(
    proposal_id: str,
    house_id: str,
) -> dict:
    """Assign a responsible house to a proposal."""
    await _ensure_connected()

    now = datetime.utcnow()
    updated = await db.db.proposals.find_one_and_update(
        {"_id": ObjectId(proposal_id)},
        {"$set": {"responsible_house_id": house_id, "updated_at": now}},
        return_document=True,
    )
    if not updated:
        raise Exception("Proposal not found")
    return updated


async def delete_proposal(proposal_id: str) -> bool:
    """Delete a proposal."""
    await _ensure_connected()

    try:
        result = await db.db.proposals.delete_one({"_id": ObjectId(proposal_id)})
        return result.deleted_count > 0
    except Exception:
        return False
