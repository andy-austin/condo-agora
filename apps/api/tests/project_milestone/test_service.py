from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.project_milestone.service import (
    create_milestone,
    delete_milestone,
    get_milestone,
    get_milestones,
    update_milestone_status,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_project_milestones_collection,
)


def _make_milestone(
    id=None,
    proposal_id="prop-1",
    title="Install CCTV",
    status="PENDING",
    created_by="admin-1",
):
    return {
        "_id": id or ObjectId(),
        "proposal_id": proposal_id,
        "title": title,
        "description": "Install cameras",
        "status": status,
        "due_date": None,
        "completed_at": None,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetMilestones:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_project_milestones_collection.find.return_value = cursor_mock

        result = await get_milestones("prop-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_milestones(self):
        milestones = [_make_milestone(title="Step 1"), _make_milestone(title="Step 2")]
        cursor_mock = create_async_cursor_mock(milestones)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(milestones))
        mock_project_milestones_collection.find.return_value = cursor_mock

        result = await get_milestones("prop-1")
        assert len(result) == 2


class TestGetMilestone:
    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_milestone("not-valid")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_milestone_by_id(self):
        m_id = ObjectId()
        m = _make_milestone(id=m_id)
        mock_project_milestones_collection.find_one.return_value = m

        result = await get_milestone(str(m_id))
        assert result["title"] == "Install CCTV"


class TestCreateMilestone:
    @pytest.mark.asyncio
    async def test_creates_milestone(self):
        m_id = ObjectId()
        created = _make_milestone(id=m_id)
        mock_project_milestones_collection.insert_one.return_value = MagicMock(
            inserted_id=m_id
        )
        mock_project_milestones_collection.find_one.return_value = created

        result = await create_milestone("prop-1", "Install CCTV", "Details", "admin-1")
        assert result["title"] == "Install CCTV"
        assert result["status"] == "PENDING"


class TestUpdateMilestoneStatus:
    @pytest.mark.asyncio
    async def test_updates_to_in_progress(self):
        m_id = ObjectId()
        updated = _make_milestone(id=m_id, status="IN_PROGRESS")
        mock_project_milestones_collection.find_one_and_update.return_value = updated

        result = await update_milestone_status(str(m_id), "IN_PROGRESS")
        assert result["status"] == "IN_PROGRESS"

    @pytest.mark.asyncio
    async def test_updates_to_completed(self):
        m_id = ObjectId()
        updated = _make_milestone(id=m_id, status="COMPLETED")
        mock_project_milestones_collection.find_one_and_update.return_value = updated

        result = await update_milestone_status(str(m_id), "COMPLETED")
        assert result["status"] == "COMPLETED"

    @pytest.mark.asyncio
    async def test_raises_on_invalid_status(self):
        with pytest.raises(Exception, match="Invalid status"):
            await update_milestone_status("507f1f77bcf86cd799439011", "UNKNOWN")

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_project_milestones_collection.find_one_and_update.return_value = None
        with pytest.raises(Exception, match="not found"):
            await update_milestone_status("507f1f77bcf86cd799439011", "COMPLETED")


class TestDeleteMilestone:
    @pytest.mark.asyncio
    async def test_deletes_milestone(self):
        mock_project_milestones_collection.delete_one.return_value = MagicMock(
            deleted_count=1
        )
        result = await delete_milestone("507f1f77bcf86cd799439011")
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_for_invalid_id(self):
        result = await delete_milestone("not-valid")
        assert result is False
