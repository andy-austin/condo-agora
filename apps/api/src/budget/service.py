from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from ...database import db


async def _ensure_connected():
    if not db.is_connected():
        await db.connect()


async def get_budget(proposal_id: str) -> Optional[dict]:
    """Get budget for a proposal."""
    await _ensure_connected()
    return await db.db.budgets.find_one({"proposal_id": proposal_id})


async def get_budgets(organization_id: str) -> List[dict]:
    """Get all budgets for proposals in an organization."""
    await _ensure_connected()

    # Find all proposals in org
    proposal_ids = []
    async for proposal in db.db.proposals.find(
        {"organization_id": organization_id}, {"_id": 1}
    ):
        proposal_ids.append(str(proposal["_id"]))

    budgets = []
    async for budget in db.db.budgets.find({"proposal_id": {"$in": proposal_ids}}).sort(
        "created_at", -1
    ):
        budgets.append(budget)
    return budgets


async def create_or_update_budget(
    proposal_id: str,
    approved_amount: float,
    currency: str,
    created_by: str,
) -> dict:
    """Create or update a budget for a proposal."""
    await _ensure_connected()

    now = datetime.utcnow()
    existing = await get_budget(proposal_id)

    if existing:
        updated = await db.db.budgets.find_one_and_update(
            {"proposal_id": proposal_id},
            {
                "$set": {
                    "approved_amount": approved_amount,
                    "currency": currency,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        return updated
    else:
        data = {
            "proposal_id": proposal_id,
            "approved_amount": approved_amount,
            "spent_amount": 0.0,
            "currency": currency,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.db.budgets.insert_one(data)
        return await db.db.budgets.find_one({"_id": result.inserted_id})


async def update_spent_amount(proposal_id: str, spent_amount: float) -> dict:
    """Update the spent amount for a proposal's budget."""
    await _ensure_connected()

    now = datetime.utcnow()
    updated = await db.db.budgets.find_one_and_update(
        {"proposal_id": proposal_id},
        {"$set": {"spent_amount": spent_amount, "updated_at": now}},
        return_document=True,
    )
    if not updated:
        raise Exception("Budget not found for this proposal")
    return updated


def _enrich_budget(budget: dict, total_houses: int) -> dict:
    """Add computed fields to budget."""
    budget = dict(budget)
    budget["variance"] = budget["approved_amount"] - budget["spent_amount"]
    budget["cost_per_unit"] = (
        budget["spent_amount"] / total_houses if total_houses > 0 else 0.0
    )
    return budget


async def get_financial_summary(organization_id: str) -> dict:
    """Get financial summary for all budgets in an org."""
    await _ensure_connected()

    budgets = await get_budgets(organization_id)
    total_houses = await db.db.houses.count_documents(
        {"organization_id": organization_id}
    )

    total_approved = sum(b["approved_amount"] for b in budgets)
    total_spent = sum(b["spent_amount"] for b in budgets)

    return {
        "total_approved": total_approved,
        "total_spent": total_spent,
        "total_remaining": total_approved - total_spent,
        "project_count": len(budgets),
        "currency": budgets[0]["currency"] if budgets else "USD",
        "_total_houses": total_houses,
    }
