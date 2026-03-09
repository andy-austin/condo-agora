from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.announcement.service import (
    create_announcement,
    delete_announcement,
    get_announcement,
    get_announcements,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_announcements_collection,
)


def _make_mock_announcement(
    id=None,
    organization_id="org-1",
    author_id="admin-1",
    title="Important Update",
    content="Details here.",
    is_pinned=False,
):
    return {
        "_id": id or ObjectId(),
        "organization_id": organization_id,
        "author_id": author_id,
        "title": title,
        "content": content,
        "is_pinned": is_pinned,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetAnnouncements:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_announcements(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_announcements_collection.find.return_value = cursor_mock

        result = await get_announcements("org-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_announcements_for_org(self):
        announcements = [
            _make_mock_announcement(title="First", is_pinned=True),
            _make_mock_announcement(title="Second"),
        ]
        cursor_mock = create_async_cursor_mock(announcements)
        cursor_mock.sort = MagicMock(
            return_value=create_async_cursor_mock(announcements)
        )
        mock_announcements_collection.find.return_value = cursor_mock

        result = await get_announcements("org-1")
        assert len(result) == 2


class TestGetAnnouncement:
    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_announcement("not-valid")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_announcement_by_id(self):
        ann_id = ObjectId()
        ann = _make_mock_announcement(id=ann_id)
        mock_announcements_collection.find_one.return_value = ann

        result = await get_announcement(str(ann_id))
        assert result["title"] == "Important Update"


class TestCreateAnnouncement:
    @pytest.mark.asyncio
    async def test_creates_announcement(self):
        ann_id = ObjectId()
        created = _make_mock_announcement(id=ann_id, title="New Announcement")
        mock_announcements_collection.insert_one.return_value = MagicMock(
            inserted_id=ann_id
        )
        mock_announcements_collection.find_one.return_value = created

        result = await create_announcement(
            "org-1", "admin-1", "New Announcement", "Content here"
        )
        assert result["title"] == "New Announcement"

    @pytest.mark.asyncio
    async def test_creates_pinned_announcement(self):
        ann_id = ObjectId()
        created = _make_mock_announcement(id=ann_id, is_pinned=True)
        mock_announcements_collection.insert_one.return_value = MagicMock(
            inserted_id=ann_id
        )
        mock_announcements_collection.find_one.return_value = created

        result = await create_announcement(
            "org-1", "admin-1", "Urgent", "Content", is_pinned=True
        )
        assert result["is_pinned"] is True


class TestDeleteAnnouncement:
    @pytest.mark.asyncio
    async def test_deletes_announcement(self):
        mock_announcements_collection.delete_one.return_value = MagicMock(
            deleted_count=1
        )

        result = await delete_announcement("507f1f77bcf86cd799439011")
        assert result is True
