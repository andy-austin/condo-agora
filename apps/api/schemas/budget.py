from typing import Optional

import strawberry

from ..graphql_types.budget import Budget, FinancialSummary
from ..resolvers.budget import (
    resolve_financial_summary,
    resolve_proposal_budget,
    resolve_set_budget,
    resolve_update_spent_amount,
)


@strawberry.type
class BudgetQueries:
    proposal_budget: Optional[Budget] = strawberry.field(
        resolver=resolve_proposal_budget
    )
    financial_summary: FinancialSummary = strawberry.field(
        resolver=resolve_financial_summary
    )


@strawberry.type
class BudgetMutations:
    set_budget: Budget = strawberry.mutation(resolver=resolve_set_budget)
    update_spent_amount: Budget = strawberry.mutation(
        resolver=resolve_update_spent_amount
    )
