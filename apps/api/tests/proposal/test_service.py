from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.proposal.service import (
    create_proposal,
    delete_proposal,
    get_proposal,
    get_proposals,
    update_proposal,
    update_proposal_status,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_proposals_collection,
)


def _make_mock_proposal_doc(
    id=None,
    title="Fix the elevator",
    description="The elevator has been broken for a month.",
    category="MAINTENANCE",
    status="DRAFT",
    organization_id="org-1",
    author_id="user-1",
):
    """Create a mock proposal document (MongoDB-style dict)."""
    return {
        "_id": id or ObjectId(),
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "author_id": author_id,
        "organization_id": organization_id,
        "responsible_house_id": None,
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetProposals:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_proposals(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_proposals_collection.find.return_value = cursor_mock

        result = await get_proposals("org-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_proposals_for_organization(self):
        proposals = [
            _make_mock_proposal_doc(title="Proposal A"),
            _make_mock_proposal_doc(title="Proposal B"),
        ]
        cursor_mock = create_async_cursor_mock(proposals)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(proposals))
        mock_proposals_collection.find.return_value = cursor_mock

        result = await get_proposals("org-1")
        assert len(result) == 2
        assert result[0]["title"] == "Proposal A"

    @pytest.mark.asyncio
    async def test_filters_by_status(self):
        proposals = [_make_mock_proposal_doc(status="OPEN")]
        cursor_mock = create_async_cursor_mock(proposals)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(proposals))
        mock_proposals_collection.find.return_value = cursor_mock

        result = await get_proposals("org-1", status="OPEN")
        assert len(result) == 1
        # Verify that the find was called with status filter
        call_args = mock_proposals_collection.find.call_args[0][0]
        assert call_args.get("status") == "OPEN"

    @pytest.mark.asyncio
    async def test_filters_by_category(self):
        proposals = [_make_mock_proposal_doc(category="SECURITY")]
        cursor_mock = create_async_cursor_mock(proposals)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(proposals))
        mock_proposals_collection.find.return_value = cursor_mock

        result = await get_proposals("org-1", category="SECURITY")
        assert len(result) == 1
        call_args = mock_proposals_collection.find.call_args[0][0]
        assert call_args.get("category") == "SECURITY"


class TestGetProposal:
    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_proposals_collection.find_one.return_value = None
        result = await get_proposal("507f1f77bcf86cd799439011")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_proposal_by_id(self):
        proposal_id = ObjectId()
        proposal = _make_mock_proposal_doc(id=proposal_id, title="Fix elevator")
        mock_proposals_collection.find_one.return_value = proposal

        result = await get_proposal(str(proposal_id))
        assert result["title"] == "Fix elevator"

    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_proposal("not-a-valid-object-id")
        assert result is None


class TestCreateProposal:
    @pytest.mark.asyncio
    async def test_creates_proposal(self):
        proposal_id = ObjectId()
        created = _make_mock_proposal_doc(id=proposal_id, title="New Proposal")
        mock_proposals_collection.insert_one.return_value = MagicMock(
            inserted_id=proposal_id
        )
        mock_proposals_collection.find_one.return_value = created

        result = await create_proposal(
            "org-1", "New Proposal", "A description", "MAINTENANCE", "user-1"
        )
        assert result["title"] == "New Proposal"
        mock_proposals_collection.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_creates_proposal_as_draft_by_default(self):
        proposal_id = ObjectId()
        created = _make_mock_proposal_doc(id=proposal_id, status="DRAFT")
        mock_proposals_collection.insert_one.return_value = MagicMock(
            inserted_id=proposal_id
        )
        mock_proposals_collection.find_one.return_value = created

        result = await create_proposal(
            "org-1", "A proposal", "Description", "OTHER", "user-1"
        )
        assert result["status"] == "DRAFT"

    @pytest.mark.asyncio
    async def test_creates_proposal_as_open_when_specified(self):
        proposal_id = ObjectId()
        created = _make_mock_proposal_doc(id=proposal_id, status="OPEN")
        mock_proposals_collection.insert_one.return_value = MagicMock(
            inserted_id=proposal_id
        )
        mock_proposals_collection.find_one.return_value = created

        result = await create_proposal(
            "org-1", "A proposal", "Description", "OTHER", "user-1", status="OPEN"
        )
        assert result["status"] == "OPEN"


class TestUpdateProposal:
    @pytest.mark.asyncio
    async def test_updates_proposal_fields(self):
        proposal_id = ObjectId()
        updated = _make_mock_proposal_doc(
            id=proposal_id, title="Updated Title", category="SECURITY"
        )
        mock_proposals_collection.find_one_and_update.return_value = updated

        result = await update_proposal(
            str(proposal_id), "Updated Title", "New description", "SECURITY"
        )
        assert result["title"] == "Updated Title"
        assert result["category"] == "SECURITY"


class TestUpdateProposalStatus:
    @pytest.mark.asyncio
    async def test_transitions_draft_to_open(self):
        proposal_id = ObjectId()
        proposal = _make_mock_proposal_doc(id=proposal_id, status="DRAFT")
        mock_proposals_collection.find_one.return_value = proposal

        updated = _make_mock_proposal_doc(id=proposal_id, status="OPEN")
        mock_proposals_collection.find_one_and_update.return_value = updated

        result = await update_proposal_status(str(proposal_id), "OPEN")
        assert result["status"] == "OPEN"

    @pytest.mark.asyncio
    async def test_transitions_open_to_voting(self):
        proposal_id = ObjectId()
        proposal = _make_mock_proposal_doc(id=proposal_id, status="OPEN")
        mock_proposals_collection.find_one.return_value = proposal

        updated = _make_mock_proposal_doc(id=proposal_id, status="VOTING")
        mock_proposals_collection.find_one_and_update.return_value = updated

        result = await update_proposal_status(str(proposal_id), "VOTING")
        assert result["status"] == "VOTING"

    @pytest.mark.asyncio
    async def test_raises_on_invalid_transition(self):
        proposal_id = ObjectId()
        proposal = _make_mock_proposal_doc(id=proposal_id, status="DRAFT")
        mock_proposals_collection.find_one.return_value = proposal

        with pytest.raises(Exception, match="Cannot transition"):
            await update_proposal_status(str(proposal_id), "APPROVED")

    @pytest.mark.asyncio
    async def test_raises_when_proposal_not_found(self):
        mock_proposals_collection.find_one.return_value = None

        with pytest.raises(Exception, match="Proposal not found"):
            await update_proposal_status("507f1f77bcf86cd799439011", "OPEN")

    @pytest.mark.asyncio
    async def test_sets_rejection_reason_on_reject(self):
        proposal_id = ObjectId()
        proposal = _make_mock_proposal_doc(id=proposal_id, status="OPEN")
        mock_proposals_collection.find_one.return_value = proposal

        updated = _make_mock_proposal_doc(id=proposal_id, status="REJECTED")
        updated["rejection_reason"] = "Not feasible"
        mock_proposals_collection.find_one_and_update.return_value = updated

        result = await update_proposal_status(
            str(proposal_id), "REJECTED", rejection_reason="Not feasible"
        )
        assert result["rejection_reason"] == "Not feasible"


class TestDeleteProposal:
    @pytest.mark.asyncio
    async def test_deletes_proposal(self):
        mock_proposals_collection.delete_one.return_value = MagicMock(deleted_count=1)

        result = await delete_proposal("507f1f77bcf86cd799439011")
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self):
        mock_proposals_collection.delete_one.return_value = MagicMock(deleted_count=0)

        result = await delete_proposal("507f1f77bcf86cd799439011")
        assert result is False
