from typing import List, Optional

import strawberry

from ..graphql_types.proposal import Proposal
from ..resolvers.proposal import (
    resolve_assign_responsible_house,
    resolve_create_proposal,
    resolve_delete_proposal,
    resolve_proposal,
    resolve_proposals,
    resolve_update_proposal,
    resolve_update_proposal_status,
)


@strawberry.type
class ProposalQueries:
    proposals: List[Proposal] = strawberry.field(resolver=resolve_proposals)
    proposal: Optional[Proposal] = strawberry.field(resolver=resolve_proposal)


@strawberry.type
class ProposalMutations:
    create_proposal: Proposal = strawberry.mutation(resolver=resolve_create_proposal)
    update_proposal: Proposal = strawberry.mutation(resolver=resolve_update_proposal)
    update_proposal_status: Proposal = strawberry.mutation(
        resolver=resolve_update_proposal_status
    )
    assign_responsible_house: Proposal = strawberry.mutation(
        resolver=resolve_assign_responsible_house
    )
    delete_proposal: bool = strawberry.mutation(resolver=resolve_delete_proposal)
