from typing import List, Optional

import strawberry

from ..graphql_types.budget import Budget, FinancialSummary
from ..src.auth.permissions import require_org_admin, require_org_member
from ..src.budget.service import create_or_update_budget as service_upsert
from ..src.budget.service import get_budget as service_get
from ..src.budget.service import get_budgets as service_list
from ..src.budget.service import get_financial_summary as service_summary
from ..src.budget.service import update_spent_amount as service_update_spent


def _budget_to_graphql(b: dict, total_houses: int = 0) -> Budget:
    return Budget(
        id=str(b["_id"]),
        proposal_id=b["proposal_id"],
        approved_amount=b["approved_amount"],
        spent_amount=b["spent_amount"],
        currency=b["currency"],
        created_by=b["created_by"],
        created_at=b["created_at"],
        updated_at=b["updated_at"],
        variance=b["approved_amount"] - b["spent_amount"],
        cost_per_unit=(b["spent_amount"] / total_houses if total_houses > 0 else 0.0),
    )


async def resolve_proposal_budget(
    info: strawberry.types.Info,
    proposal_id: str,
) -> Optional[Budget]:
    """Get budget for a proposal. MEMBER only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_member(user, proposal["organization_id"])

    from ...database import db

    total_houses = await db.db.houses.count_documents(
        {"organization_id": proposal["organization_id"]}
    )
    budget = await service_get(proposal_id)
    if not budget:
        return None
    return _budget_to_graphql(budget, total_houses)


async def resolve_financial_summary(
    info: strawberry.types.Info,
    organization_id: str,
) -> FinancialSummary:
    """Get financial summary for an organization. MEMBER only."""
    user = info.context.get("user")
    await require_org_member(user, organization_id)

    summary = await service_summary(organization_id)
    return FinancialSummary(
        total_approved=summary["total_approved"],
        total_spent=summary["total_spent"],
        total_remaining=summary["total_remaining"],
        project_count=summary["project_count"],
        currency=summary["currency"],
    )


async def resolve_set_budget(
    info: strawberry.types.Info,
    proposal_id: str,
    approved_amount: float,
    currency: str = "USD",
) -> Budget:
    """Set or update the approved budget. ADMIN only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_admin(user, proposal["organization_id"])

    created_by = user.get("id") or str(user.get("_id"))

    from ...database import db

    total_houses = await db.db.houses.count_documents(
        {"organization_id": proposal["organization_id"]}
    )
    budget = await service_upsert(proposal_id, approved_amount, currency, created_by)
    return _budget_to_graphql(budget, total_houses)


async def resolve_update_spent_amount(
    info: strawberry.types.Info,
    proposal_id: str,
    spent_amount: float,
) -> Budget:
    """Update the spent amount. ADMIN only."""
    from ..src.proposal.service import get_proposal

    user = info.context.get("user")
    proposal = await get_proposal(proposal_id)
    if not proposal:
        raise Exception("Proposal not found")
    await require_org_admin(user, proposal["organization_id"])

    from ...database import db

    total_houses = await db.db.houses.count_documents(
        {"organization_id": proposal["organization_id"]}
    )
    budget = await service_update_spent(proposal_id, spent_amount)
    return _budget_to_graphql(budget, total_houses)
