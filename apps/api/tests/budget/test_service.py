from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.budget.service import (
    create_or_update_budget,
    get_budget,
    update_spent_amount,
)

from ..conftest import (
    mock_budgets_collection,
)


def _make_budget(
    id=None,
    proposal_id="prop-1",
    approved_amount=50000.0,
    spent_amount=0.0,
    currency="USD",
    created_by="admin-1",
):
    return {
        "_id": id or ObjectId(),
        "proposal_id": proposal_id,
        "approved_amount": approved_amount,
        "spent_amount": spent_amount,
        "currency": currency,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetBudget:
    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_budgets_collection.find_one.return_value = None
        result = await get_budget("prop-1")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_budget(self):
        budget = _make_budget()
        mock_budgets_collection.find_one.return_value = budget
        result = await get_budget("prop-1")
        assert result["approved_amount"] == 50000.0


class TestCreateOrUpdateBudget:
    @pytest.mark.asyncio
    async def test_creates_new_budget(self):
        budget_id = ObjectId()
        budget = _make_budget(id=budget_id)
        mock_budgets_collection.find_one.side_effect = [None, budget]
        mock_budgets_collection.insert_one.return_value = MagicMock(
            inserted_id=budget_id
        )

        result = await create_or_update_budget("prop-1", 50000.0, "USD", "admin-1")
        assert result["approved_amount"] == 50000.0

    @pytest.mark.asyncio
    async def test_updates_existing_budget(self):
        existing = _make_budget()
        updated = _make_budget(approved_amount=75000.0)
        # find_one is called once in get_budget, returns existing
        mock_budgets_collection.find_one.return_value = existing
        mock_budgets_collection.find_one.side_effect = None
        mock_budgets_collection.find_one_and_update.return_value = updated

        result = await create_or_update_budget("prop-1", 75000.0, "USD", "admin-1")
        assert result["approved_amount"] == 75000.0


class TestUpdateSpentAmount:
    @pytest.mark.asyncio
    async def test_updates_spent_amount(self):
        updated = _make_budget(spent_amount=10000.0)
        mock_budgets_collection.find_one_and_update.return_value = updated

        result = await update_spent_amount("prop-1", 10000.0)
        assert result["spent_amount"] == 10000.0

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_budgets_collection.find_one_and_update.return_value = None
        with pytest.raises(Exception, match="not found"):
            await update_spent_amount("prop-1", 5000.0)
