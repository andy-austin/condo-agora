from typing import List, Optional

import strawberry

from ..graphql_types.voting import (
    ProposalScore,
    RankingEntry,
    RankingInput,
    Vote,
    VotingResults,
    VotingSession,
)
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.voting.service import cast_vote as service_cast_vote
from ..src.voting.service import close_voting_session as service_close
from ..src.voting.service import create_voting_session as service_create
from ..src.voting.service import get_vote_for_house as service_get_vote
from ..src.voting.service import get_voting_results as service_get_results
from ..src.voting.service import get_voting_session as service_get_session
from ..src.voting.service import get_voting_sessions as service_list_sessions
from ..src.voting.service import open_voting_session as service_open
from ..src.voting.service import (
    update_voting_session_proposals as service_update_proposals,
)


def _ranking_to_graphql(r: dict) -> RankingEntry:
    return RankingEntry(proposal_id=r["proposal_id"], rank=r["rank"])


def _vote_to_graphql(v: dict) -> Vote:
    return Vote(
        id=str(v["_id"]),
        voting_session_id=v["voting_session_id"],
        house_id=v["house_id"],
        voter_id=v["voter_id"],
        rankings=[_ranking_to_graphql(r) for r in v.get("rankings", [])],
        submitted_at=v["submitted_at"],
        created_at=v["created_at"],
        updated_at=v["updated_at"],
    )


def _session_to_graphql(s: dict) -> VotingSession:
    return VotingSession(
        id=str(s["_id"]),
        organization_id=s["organization_id"],
        title=s["title"],
        status=s["status"],
        proposal_ids=s.get("proposal_ids", []),
        start_date=s.get("start_date"),
        end_date=s.get("end_date"),
        created_by=s["created_by"],
        created_at=s["created_at"],
        updated_at=s["updated_at"],
    )


def _results_to_graphql(r: dict) -> VotingResults:
    scores = [
        ProposalScore(
            proposal_id=ps["proposal_id"],
            title=ps["title"],
            score=ps["score"],
            votes_count=ps["votes_count"],
            rank=ps["rank"],
            approval_percentage=ps["approval_percentage"],
            is_approved=ps["is_approved"],
        )
        for ps in r["proposal_scores"]
    ]
    return VotingResults(
        session_id=r["session_id"],
        session_title=r["session_title"],
        status=r["status"],
        total_houses=r["total_houses"],
        votes_cast=r["votes_cast"],
        participation_rate=r["participation_rate"],
        proposal_scores=scores,
    )


async def resolve_voting_sessions(
    info: strawberry.types.Info,
    organization_id: str,
) -> List[VotingSession]:
    """List all voting sessions for an organization. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)
    sessions = await service_list_sessions(organization_id)
    return [_session_to_graphql(s) for s in sessions]


async def resolve_voting_session(
    info: strawberry.types.Info,
    id: str,
) -> Optional[VotingSession]:
    """Get a single voting session. MEMBER only."""
    user = info.context.get("user")
    session = await service_get_session(id)
    if not session:
        return None
    await require_org_member(user, session["organization_id"])
    return _session_to_graphql(session)


async def resolve_voting_results(
    info: strawberry.types.Info,
    session_id: str,
) -> VotingResults:
    """Get voting results for a session. MEMBER only."""
    user = info.context.get("user")
    session = await service_get_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_member(user, session["organization_id"])
    results = await service_get_results(session_id)
    return _results_to_graphql(results)


async def resolve_my_vote(
    info: strawberry.types.Info,
    session_id: str,
    house_id: str,
) -> Optional[Vote]:
    """Get the current user's vote for a session."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")
    session = await service_get_session(session_id)
    if not session:
        return None
    await require_org_member(user, session["organization_id"])
    vote = await service_get_vote(session_id, house_id)
    if not vote:
        return None
    return _vote_to_graphql(vote)


async def resolve_create_voting_session(
    info: strawberry.types.Info,
    organization_id: str,
    title: str,
    proposal_ids: List[str],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> VotingSession:
    """Create a voting session. ADMIN only."""
    user = info.context.get("user")
    await require_org_admin(user, organization_id)
    created_by = user.get("id") or str(user.get("_id"))

    from datetime import datetime

    sd = datetime.fromisoformat(start_date) if start_date else None
    ed = datetime.fromisoformat(end_date) if end_date else None

    session = await service_create(
        organization_id, title, proposal_ids, created_by, sd, ed
    )
    return _session_to_graphql(session)


async def resolve_update_voting_session_proposals(
    info: strawberry.types.Info,
    session_id: str,
    proposal_ids: List[str],
) -> VotingSession:
    """Update proposals in a DRAFT voting session. ADMIN only."""
    user = info.context.get("user")
    session = await service_get_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_admin(user, session["organization_id"])
    updated = await service_update_proposals(session_id, proposal_ids)
    return _session_to_graphql(updated)


async def resolve_open_voting_session(
    info: strawberry.types.Info,
    session_id: str,
) -> VotingSession:
    """Open a voting session. ADMIN only."""
    user = info.context.get("user")
    session = await service_get_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_admin(user, session["organization_id"])
    updated = await service_open(session_id)
    return _session_to_graphql(updated)


async def resolve_close_voting_session(
    info: strawberry.types.Info,
    session_id: str,
) -> VotingSession:
    """Close a voting session and calculate results. ADMIN only."""
    user = info.context.get("user")
    session = await service_get_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_admin(user, session["organization_id"])
    updated = await service_close(session_id)
    return _session_to_graphql(updated)


async def resolve_cast_vote(
    info: strawberry.types.Info,
    session_id: str,
    house_id: str,
    rankings: List[RankingInput],
) -> Vote:
    """Cast or update a vote. Must be a resident of the house."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    session = await service_get_session(session_id)
    if not session:
        raise Exception("Voting session not found")
    await require_org_member(user, session["organization_id"])

    voter_id = user.get("id") or str(user.get("_id"))
    rankings_dicts = [{"proposal_id": r.proposal_id, "rank": r.rank} for r in rankings]
    vote = await service_cast_vote(session_id, house_id, voter_id, rankings_dicts)
    return _vote_to_graphql(vote)
