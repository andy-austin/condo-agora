from typing import Optional

import strawberry

from ..graphql_types.proposal import Proposal
from ..graphql_types.proposal_vote import ProposalVote, ProposalVoteResults
from ..resolvers.proposal import _mongo_proposal_to_graphql
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.proposal.service import get_proposal as service_get_proposal
from ..src.proposal_vote.service import cast_proposal_vote as service_cast_vote
from ..src.proposal_vote.service import close_proposal_vote as service_close_vote
from ..src.proposal_vote.service import get_my_proposal_vote as service_get_my_vote
from ..src.proposal_vote.service import get_proposal_vote_results as service_get_results
from ..src.proposal_vote.service import start_proposal_vote as service_start_vote


def _vote_to_graphql(v: dict) -> ProposalVote:
    return ProposalVote(
        id=str(v["_id"]),
        proposal_id=v["proposal_id"],
        house_id=v["house_id"],
        voter_id=v["voter_id"],
        vote=v["vote"],
        created_at=v["created_at"],
        updated_at=v["updated_at"],
    )


def _results_to_graphql(r: dict) -> ProposalVoteResults:
    return ProposalVoteResults(
        yes_count=r["yes_count"],
        no_count=r["no_count"],
        total_houses=r["total_houses"],
        yes_percentage=r["yes_percentage"],
        threshold=r["threshold"],
        is_approved=r["is_approved"],
        vote_status=r["vote_status"],
    )


async def resolve_start_proposal_vote(
    info: strawberry.types.Info,
    proposal_id: str,
    threshold: int = 66,
) -> Proposal:
    """Start a yes/no vote on a proposal. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_admin(user, proposal["organization_id"])
    admin_id = user.get("id") or str(user.get("_id"))

    updated = await service_start_vote(proposal_id, threshold, admin_id)
    return _mongo_proposal_to_graphql(updated)


async def resolve_cast_proposal_vote(
    info: strawberry.types.Info,
    proposal_id: str,
    house_id: str,
    vote: str,
) -> ProposalVote:
    """Cast or update a yes/no vote. Must be designated voter."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_member(user, proposal["organization_id"])
    voter_id = user.get("id") or str(user.get("_id"))

    vote_doc = await service_cast_vote(proposal_id, house_id, voter_id, vote)
    return _vote_to_graphql(vote_doc)


async def resolve_close_proposal_vote(
    info: strawberry.types.Info,
    proposal_id: str,
) -> Proposal:
    """Close a yes/no vote on a proposal. ADMIN only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_admin(user, proposal["organization_id"])
    admin_id = user.get("id") or str(user.get("_id"))

    updated = await service_close_vote(proposal_id, admin_id)
    return _mongo_proposal_to_graphql(updated)


async def resolve_proposal_vote_results(
    info: strawberry.types.Info,
    proposal_id: str,
) -> ProposalVoteResults:
    """Get vote results for a proposal. Any org member."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")

    await require_org_member(user, proposal["organization_id"])
    results = await service_get_results(proposal_id)
    return _results_to_graphql(results)


async def resolve_my_proposal_vote(
    info: strawberry.types.Info,
    proposal_id: str,
    house_id: str,
) -> Optional[ProposalVote]:
    """Get the current user's vote on a proposal."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    proposal = await service_get_proposal(proposal_id)
    if not proposal:
        return None

    await require_org_member(user, proposal["organization_id"])
    vote = await service_get_my_vote(proposal_id, house_id)
    if not vote:
        return None
    return _vote_to_graphql(vote)
