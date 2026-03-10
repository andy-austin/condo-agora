from datetime import datetime
from typing import Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def start_proposal_vote(
    proposal_id: str, threshold: int, admin_user_id: str
) -> dict:
    """Start a yes/no vote on a proposal."""
    await _ensure_connected()

    proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise Exception("Proposal not found")
    if proposal["status"] != "VOTING":
        raise Exception("Proposal must be in VOTING status to start a vote")
    if proposal.get("vote_status") == "ACTIVE":
        raise Exception("A vote is already active on this proposal")

    now = datetime.utcnow()
    updated = await db.db.proposals.find_one_and_update(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "vote_status": "ACTIVE",
                "vote_threshold": threshold,
                "vote_started_at": now,
                "vote_started_by": admin_user_id,
                "updated_at": now,
            }
        },
        return_document=True,
    )
    return updated


async def cast_proposal_vote(
    proposal_id: str, house_id: str, voter_id: str, vote: str
) -> dict:
    """Cast or update a yes/no vote for a house on a proposal."""
    await _ensure_connected()

    if vote not in ("YES", "NO"):
        raise Exception("Vote must be YES or NO")

    proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise Exception("Proposal not found")
    if proposal.get("vote_status") != "ACTIVE":
        raise Exception("No active vote on this proposal")

    # Verify caller is the designated voter for this house
    house = await db.db.houses.find_one({"_id": ObjectId(house_id)})
    if not house:
        raise Exception("House not found")
    if not house.get("voter_user_id"):
        raise Exception("No designated voter assigned to this house")
    if house["voter_user_id"] != voter_id:
        raise Exception("Only the designated voter can cast votes for this house")

    now = datetime.utcnow()
    existing = await db.db.proposal_votes.find_one(
        {"proposal_id": proposal_id, "house_id": house_id}
    )

    if existing:
        vote_doc = await db.db.proposal_votes.find_one_and_update(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "voter_id": voter_id,
                    "vote": vote,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
    else:
        vote_data = {
            "proposal_id": proposal_id,
            "house_id": house_id,
            "voter_id": voter_id,
            "vote": vote,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.db.proposal_votes.insert_one(vote_data)
        vote_doc = await db.db.proposal_votes.find_one({"_id": result.inserted_id})

    # Check auto-approval after each vote
    await _check_auto_approval(proposal_id)

    return vote_doc


async def _check_auto_approval(proposal_id: str) -> None:
    """Check if YES votes meet the threshold and auto-approve the proposal."""
    await _ensure_connected()

    proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal or proposal.get("vote_status") != "ACTIVE":
        return

    threshold = proposal.get("vote_threshold", 66)
    organization_id = proposal["organization_id"]

    total_houses = await db.db.houses.count_documents(
        {"organization_id": organization_id}
    )
    if total_houses == 0:
        return

    yes_count = await db.db.proposal_votes.count_documents(
        {"proposal_id": proposal_id, "vote": "YES"}
    )

    yes_percentage = (yes_count / total_houses) * 100

    if yes_percentage >= threshold:
        now = datetime.utcnow()
        await db.db.proposals.update_one(
            {"_id": ObjectId(proposal_id), "status": "VOTING"},
            {"$set": {"status": "APPROVED", "updated_at": now}},
        )


async def close_proposal_vote(proposal_id: str, admin_user_id: str) -> dict:
    """Close a yes/no vote on a proposal."""
    await _ensure_connected()

    proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise Exception("Proposal not found")
    if proposal.get("vote_status") != "ACTIVE":
        raise Exception("No active vote to close on this proposal")

    now = datetime.utcnow()
    update_fields = {
        "vote_status": "CLOSED",
        "vote_ended_at": now,
        "updated_at": now,
    }

    # If not already APPROVED, reject
    if proposal["status"] != "APPROVED":
        update_fields["status"] = "REJECTED"

    updated = await db.db.proposals.find_one_and_update(
        {"_id": ObjectId(proposal_id)},
        {"$set": update_fields},
        return_document=True,
    )
    return updated


async def get_proposal_vote_results(proposal_id: str) -> dict:
    """Get vote results for a proposal."""
    await _ensure_connected()

    proposal = await db.db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal:
        raise Exception("Proposal not found")

    organization_id = proposal["organization_id"]
    total_houses = await db.db.houses.count_documents(
        {"organization_id": organization_id}
    )

    yes_count = await db.db.proposal_votes.count_documents(
        {"proposal_id": proposal_id, "vote": "YES"}
    )
    no_count = await db.db.proposal_votes.count_documents(
        {"proposal_id": proposal_id, "vote": "NO"}
    )

    yes_percentage = (yes_count / total_houses * 100) if total_houses > 0 else 0.0
    threshold = proposal.get("vote_threshold") or 66

    return {
        "yes_count": yes_count,
        "no_count": no_count,
        "total_houses": total_houses,
        "yes_percentage": round(yes_percentage, 1),
        "threshold": threshold,
        "is_approved": proposal["status"] == "APPROVED",
        "vote_status": proposal.get("vote_status") or "CLOSED",
    }


async def get_my_proposal_vote(
    proposal_id: str, house_id: str
) -> Optional[dict]:
    """Get the vote cast by a specific house on a proposal."""
    await _ensure_connected()
    return await db.db.proposal_votes.find_one(
        {"proposal_id": proposal_id, "house_id": house_id}
    )
