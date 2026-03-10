from typing import Optional

import strawberry

from ..graphql_types.proposal import Proposal
from ..graphql_types.proposal_vote import ProposalVote, ProposalVoteResults
from ..resolvers.proposal_vote import (
    resolve_cast_proposal_vote,
    resolve_close_proposal_vote,
    resolve_my_proposal_vote,
    resolve_proposal_vote_results,
    resolve_start_proposal_vote,
)


@strawberry.type
class ProposalVoteQueries:
    proposal_vote_results: ProposalVoteResults = strawberry.field(
        resolver=resolve_proposal_vote_results
    )
    my_proposal_vote: Optional[ProposalVote] = strawberry.field(
        resolver=resolve_my_proposal_vote
    )


@strawberry.type
class ProposalVoteMutations:
    start_proposal_vote: Proposal = strawberry.mutation(
        resolver=resolve_start_proposal_vote
    )
    cast_proposal_vote: ProposalVote = strawberry.mutation(
        resolver=resolve_cast_proposal_vote
    )
    close_proposal_vote: Proposal = strawberry.mutation(
        resolver=resolve_close_proposal_vote
    )
