from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.comment.service import (
    create_comment,
    delete_comment,
    get_comment,
    get_comments,
    update_comment,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_comments_collection,
)


def _make_mock_comment(
    id=None,
    proposal_id="proposal-1",
    author_id="user-1",
    content="Great idea!",
    parent_id=None,
):
    return {
        "_id": id or ObjectId(),
        "proposal_id": proposal_id,
        "author_id": author_id,
        "content": content,
        "parent_id": parent_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetComments:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_comments(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_comments_collection.find.return_value = cursor_mock

        result = await get_comments("proposal-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_top_level_comments(self):
        comments = [
            _make_mock_comment(content="First comment"),
            _make_mock_comment(content="Second comment"),
        ]
        cursor_mock = create_async_cursor_mock(comments)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(comments))
        mock_comments_collection.find.return_value = cursor_mock

        result = await get_comments("proposal-1")
        assert len(result) == 2


class TestGetComment:
    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_comment("not-a-valid-id")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_comment_by_id(self):
        comment_id = ObjectId()
        comment = _make_mock_comment(id=comment_id)
        mock_comments_collection.find_one.return_value = comment

        result = await get_comment(str(comment_id))
        assert result["content"] == "Great idea!"


class TestCreateComment:
    @pytest.mark.asyncio
    async def test_creates_comment(self):
        comment_id = ObjectId()
        created = _make_mock_comment(id=comment_id, content="New comment")
        mock_comments_collection.insert_one.return_value = MagicMock(
            inserted_id=comment_id
        )
        mock_comments_collection.find_one.return_value = created

        result = await create_comment("proposal-1", "user-1", "New comment")
        assert result["content"] == "New comment"
        assert result["replies"] == []

    @pytest.mark.asyncio
    async def test_creates_reply_with_parent_id(self):
        parent_id = str(ObjectId())
        comment_id = ObjectId()
        created = _make_mock_comment(id=comment_id, parent_id=parent_id)
        mock_comments_collection.insert_one.return_value = MagicMock(
            inserted_id=comment_id
        )
        mock_comments_collection.find_one.return_value = created

        result = await create_comment("proposal-1", "user-1", "Reply", parent_id)
        assert result["parent_id"] == parent_id


class TestUpdateComment:
    @pytest.mark.asyncio
    async def test_updates_content(self):
        comment_id = ObjectId()
        updated = _make_mock_comment(id=comment_id, content="Updated content")
        mock_comments_collection.find_one_and_update.return_value = updated

        result = await update_comment(str(comment_id), "Updated content")
        assert result["content"] == "Updated content"


class TestDeleteComment:
    @pytest.mark.asyncio
    async def test_deletes_comment(self):
        mock_comments_collection.delete_one.return_value = MagicMock(deleted_count=1)
        mock_comments_collection.delete_many.return_value = MagicMock(deleted_count=0)

        result = await delete_comment("507f1f77bcf86cd799439011")
        assert result is True
