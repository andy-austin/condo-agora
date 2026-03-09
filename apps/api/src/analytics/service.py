from collections import defaultdict
from typing import List

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_community_analytics(organization_id: str) -> dict:
    """Compute community analytics for an organization."""
    await _ensure_connected()

    # Proposal counts by status
    status_counts: dict = defaultdict(int)
    category_counts: dict = defaultdict(int)
    monthly_counts: dict = defaultdict(int)

    async for proposal in db.db.proposals.find({"organization_id": organization_id}):
        status_counts[proposal["status"]] += 1
        category_counts[proposal.get("category", "OTHER")] += 1
        created_at = proposal.get("created_at")
        if created_at:
            month_key = created_at.strftime("%Y-%m")
            monthly_counts[month_key] += 1

    total = sum(status_counts.values())
    approved = (
        status_counts.get("APPROVED", 0)
        + status_counts.get("IN_PROGRESS", 0)
        + status_counts.get("COMPLETED", 0)
    )
    approval_rate = (approved / total * 100) if total > 0 else 0.0

    # Last voting session participation rate
    last_session_participation = 0.0
    async for session in (
        db.db.voting_sessions.find(
            {"organization_id": organization_id, "status": "CLOSED"}
        )
        .sort("created_at", -1)
        .limit(1)
    ):
        total_houses = await db.db.houses.count_documents(
            {"organization_id": organization_id}
        )
        votes_cast = await db.db.votes.count_documents(
            {"voting_session_id": str(session["_id"])}
        )
        if total_houses > 0:
            last_session_participation = votes_cast / total_houses * 100

    # Top contributors (proposals + comments)
    user_scores: dict = defaultdict(lambda: {"proposals": 0, "comments": 0})

    async for proposal in db.db.proposals.find({"organization_id": organization_id}):
        uid = proposal.get("author_id", "")
        if uid:
            user_scores[uid]["proposals"] += 1

    # Get proposal IDs for comments lookup
    proposal_ids = []
    async for p in db.db.proposals.find(
        {"organization_id": organization_id}, {"_id": 1}
    ):
        proposal_ids.append(str(p["_id"]))

    if proposal_ids:
        async for comment in db.db.comments.find(
            {"proposal_id": {"$in": proposal_ids}}
        ):
            uid = comment.get("author_id", "")
            if uid:
                user_scores[uid]["comments"] += 1

    top_contributors = sorted(
        [
            {
                "user_id": uid,
                "proposals_count": scores["proposals"],
                "comments_count": scores["comments"],
                "total_score": scores["proposals"] * 2 + scores["comments"],
            }
            for uid, scores in user_scores.items()
        ],
        key=lambda x: x["total_score"],
        reverse=True,
    )[:5]

    # Monthly trends (last 12 months, sorted)
    sorted_months = sorted(monthly_counts.items())[-12:]
    monthly_trends = [{"month": m, "count": c} for m, c in sorted_months]

    # Category breakdown
    category_breakdown = [
        {"category": cat, "count": count}
        for cat, count in sorted(
            category_counts.items(), key=lambda x: x[1], reverse=True
        )
    ]

    return {
        "organization_id": organization_id,
        "total_proposals": total,
        "approved_proposals": approved,
        "active_projects": status_counts.get("IN_PROGRESS", 0),
        "completed_projects": status_counts.get("COMPLETED", 0),
        "rejected_proposals": status_counts.get("REJECTED", 0),
        "approval_rate": round(approval_rate, 1),
        "last_session_participation_rate": round(last_session_participation, 1),
        "category_breakdown": category_breakdown,
        "monthly_trends": monthly_trends,
        "top_contributors": top_contributors,
    }


async def get_participation_report(session_id: str) -> dict:
    """Get detailed participation report for a voting session."""
    await _ensure_connected()

    from bson import ObjectId

    try:
        session = await db.db.voting_sessions.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise Exception("Voting session not found")

    if not session:
        raise Exception("Voting session not found")

    organization_id = session["organization_id"]

    # Get all houses in org
    all_house_ids = []
    async for house in db.db.houses.find({"organization_id": organization_id}):
        all_house_ids.append(str(house["_id"]))

    # Get houses that voted
    voted_house_ids = []
    async for vote in db.db.votes.find({"voting_session_id": session_id}):
        voted_house_ids.append(vote["house_id"])

    voted_set = set(voted_house_ids)
    non_voted_house_ids = [h for h in all_house_ids if h not in voted_set]

    total_houses = len(all_house_ids)
    votes_cast = len(voted_house_ids)
    participation_rate = (votes_cast / total_houses * 100) if total_houses > 0 else 0.0

    return {
        "session_id": session_id,
        "session_title": session["title"],
        "total_houses": total_houses,
        "votes_cast": votes_cast,
        "participation_rate": round(participation_rate, 1),
        "voted_house_ids": voted_house_ids,
        "non_voted_house_ids": non_voted_house_ids,
    }
