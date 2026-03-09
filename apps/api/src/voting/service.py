from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


# ---------------------------------------------------------------------------
# Voting Sessions
# ---------------------------------------------------------------------------


async def get_voting_sessions(organization_id: str) -> List[dict]:
    """Get all voting sessions for an organization."""
    await _ensure_connected()
    sessions = []
    cursor = db.db.voting_sessions.find({"organization_id": organization_id}).sort(
        "created_at", -1
    )
    async for session in cursor:
        sessions.append(session)
    return sessions


async def get_voting_session(session_id: str) -> Optional[dict]:
    """Get a single voting session by ID."""
    await _ensure_connected()
    try:
        return await db.db.voting_sessions.find_one({"_id": ObjectId(session_id)})
    except Exception:
        return None


async def create_voting_session(
    organization_id: str,
    title: str,
    proposal_ids: List[str],
    created_by: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    """Create a new voting session (admin only)."""
    await _ensure_connected()

    now = datetime.utcnow()
    data = {
        "organization_id": organization_id,
        "title": title,
        "status": "DRAFT",
        "proposal_ids": proposal_ids,
        "start_date": start_date,
        "end_date": end_date,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.db.voting_sessions.insert_one(data)
    return await db.db.voting_sessions.find_one({"_id": result.inserted_id})


async def update_voting_session_proposals(
    session_id: str,
    proposal_ids: List[str],
) -> dict:
    """Update proposal list on a DRAFT session."""
    await _ensure_connected()
    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    if session["status"] != "DRAFT":
        raise Exception("Can only modify proposals on DRAFT sessions")

    now = datetime.utcnow()
    updated = await db.db.voting_sessions.find_one_and_update(
        {"_id": ObjectId(session_id)},
        {"$set": {"proposal_ids": proposal_ids, "updated_at": now}},
        return_document=True,
    )
    return updated


async def open_voting_session(session_id: str) -> dict:
    """Open a voting session (DRAFT -> OPEN)."""
    await _ensure_connected()
    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    if session["status"] != "DRAFT":
        raise Exception("Only DRAFT sessions can be opened")
    if not session.get("proposal_ids"):
        raise Exception("Session must have at least one proposal")

    now = datetime.utcnow()
    updated = await db.db.voting_sessions.find_one_and_update(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "OPEN", "updated_at": now}},
        return_document=True,
    )
    return updated


async def close_voting_session(session_id: str) -> dict:
    """Close a voting session and calculate results."""
    await _ensure_connected()
    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    if session["status"] != "OPEN":
        raise Exception("Only OPEN sessions can be closed")

    now = datetime.utcnow()
    updated = await db.db.voting_sessions.find_one_and_update(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "CLOSED", "updated_at": now}},
        return_document=True,
    )

    # Calculate approval threshold and update proposal statuses
    await _apply_approval_threshold(session_id, session["organization_id"])

    return updated


# ---------------------------------------------------------------------------
# Votes
# ---------------------------------------------------------------------------


async def get_vote_for_house(session_id: str, house_id: str) -> Optional[dict]:
    """Get the vote cast by a specific house in a session."""
    await _ensure_connected()
    return await db.db.votes.find_one(
        {"voting_session_id": session_id, "house_id": house_id}
    )


async def cast_vote(
    session_id: str,
    house_id: str,
    voter_id: str,
    rankings: List[dict],
) -> dict:
    """Cast or update a vote for a house in a voting session."""
    await _ensure_connected()
    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    if session["status"] != "OPEN":
        raise Exception("Voting session is not open")

    # Validate ranking completeness
    proposal_ids = set(session.get("proposal_ids", []))
    ranked_ids = {r["proposal_id"] for r in rankings}
    if proposal_ids != ranked_ids:
        raise Exception("Rankings must include all proposals in the session")

    now = datetime.utcnow()
    existing = await get_vote_for_house(session_id, house_id)

    if existing:
        vote = await db.db.votes.find_one_and_update(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "voter_id": voter_id,
                    "rankings": rankings,
                    "submitted_at": now,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
    else:
        vote_data = {
            "voting_session_id": session_id,
            "house_id": house_id,
            "voter_id": voter_id,
            "rankings": rankings,
            "submitted_at": now,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.db.votes.insert_one(vote_data)
        vote = await db.db.votes.find_one({"_id": result.inserted_id})

    return vote


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------


async def get_voting_results(session_id: str) -> dict:
    """
    Calculate voting results using Borda count.
    Score = sum of (N - rank + 1) for each vote, where N = number of proposals.
    Approval: proposal ranked in top half by >= 66% of ALL houses.
    """
    await _ensure_connected()
    session = await get_voting_session(session_id)
    if not session:
        raise Exception("Voting session not found")

    organization_id = session["organization_id"]
    proposal_ids = session.get("proposal_ids", [])
    n_proposals = len(proposal_ids)

    # Count total houses in the org
    total_houses = await db.db.houses.count_documents(
        {"organization_id": organization_id}
    )

    # Get all votes
    votes = []
    async for vote in db.db.votes.find({"voting_session_id": session_id}):
        votes.append(vote)

    votes_cast = len(votes)
    participation_rate = (votes_cast / total_houses * 100) if total_houses > 0 else 0.0

    # Borda count scores
    scores: dict = {pid: 0 for pid in proposal_ids}
    top_half_counts: dict = {pid: 0 for pid in proposal_ids}
    top_half_cutoff = n_proposals // 2 + (n_proposals % 2)  # top ceil(N/2)

    for vote in votes:
        for entry in vote.get("rankings", []):
            pid = entry["proposal_id"]
            rank = entry["rank"]
            if pid in scores:
                borda_score = n_proposals - rank + 1
                scores[pid] = scores.get(pid, 0) + borda_score
                if rank <= top_half_cutoff:
                    top_half_counts[pid] = top_half_counts.get(pid, 0) + 1

    # Fetch proposal titles
    proposal_titles: dict = {}
    async for proposal in db.db.proposals.find(
        {"_id": {"$in": [ObjectId(pid) for pid in proposal_ids]}}
    ):
        proposal_titles[str(proposal["_id"])] = proposal.get("title", "")

    # Build ranked scores
    sorted_proposals = sorted(proposal_ids, key=lambda pid: scores[pid], reverse=True)
    proposal_scores = []
    for rank_idx, pid in enumerate(sorted_proposals, start=1):
        approval_pct = (
            (top_half_counts[pid] / total_houses * 100) if total_houses > 0 else 0.0
        )
        proposal_scores.append(
            {
                "proposal_id": pid,
                "title": proposal_titles.get(pid, ""),
                "score": scores[pid],
                "votes_count": votes_cast,
                "rank": rank_idx,
                "approval_percentage": round(approval_pct, 1),
                "is_approved": approval_pct >= 66.0,
            }
        )

    return {
        "session_id": session_id,
        "session_title": session["title"],
        "status": session["status"],
        "total_houses": total_houses,
        "votes_cast": votes_cast,
        "participation_rate": round(participation_rate, 1),
        "proposal_scores": proposal_scores,
    }


async def _apply_approval_threshold(session_id: str, organization_id: str) -> None:
    """Update proposal statuses based on approval threshold after session closes."""
    await _ensure_connected()
    try:
        results = await get_voting_results(session_id)
        for ps in results["proposal_scores"]:
            if ps["is_approved"]:
                # Move VOTING -> APPROVED
                await db.db.proposals.update_one(
                    {
                        "_id": ObjectId(ps["proposal_id"]),
                        "status": "VOTING",
                    },
                    {
                        "$set": {
                            "status": "APPROVED",
                            "updated_at": datetime.utcnow(),
                        }
                    },
                )
    except Exception:
        pass  # Don't fail session close if threshold calc fails
