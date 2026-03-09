from typing import List, Optional

import strawberry

from ..graphql_types.voting import Vote, VotingResults, VotingSession
from ..resolvers.voting import (
    resolve_cast_vote,
    resolve_close_voting_session,
    resolve_create_voting_session,
    resolve_my_vote,
    resolve_open_voting_session,
    resolve_update_voting_session_proposals,
    resolve_voting_results,
    resolve_voting_session,
    resolve_voting_sessions,
)


@strawberry.type
class VotingQueries:
    voting_sessions: List[VotingSession] = strawberry.field(
        resolver=resolve_voting_sessions
    )
    voting_session: Optional[VotingSession] = strawberry.field(
        resolver=resolve_voting_session
    )
    voting_results: VotingResults = strawberry.field(resolver=resolve_voting_results)
    my_vote: Optional[Vote] = strawberry.field(resolver=resolve_my_vote)


@strawberry.type
class VotingMutations:
    create_voting_session: VotingSession = strawberry.mutation(
        resolver=resolve_create_voting_session
    )
    update_voting_session_proposals: VotingSession = strawberry.mutation(
        resolver=resolve_update_voting_session_proposals
    )
    open_voting_session: VotingSession = strawberry.mutation(
        resolver=resolve_open_voting_session
    )
    close_voting_session: VotingSession = strawberry.mutation(
        resolver=resolve_close_voting_session
    )
    cast_vote: Vote = strawberry.mutation(resolver=resolve_cast_vote)
