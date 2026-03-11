from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from apps.api.src.auth.webhooks import handle_user_created, handle_user_updated


def _make_clerk_user_data(
    clerk_id="user_123",
    email="test@example.com",
    first_name="Test",
    last_name="User",
):
    return {
        "id": clerk_id,
        "email_addresses": [{"id": "email_1", "email_address": email}],
        "primary_email_address_id": "email_1",
        "first_name": first_name,
        "last_name": last_name,
        "image_url": "https://example.com/avatar.jpg",
    }


@pytest.mark.asyncio
async def test_handle_user_created_syncs_to_db():
    data = _make_clerk_user_data()

    user_id = ObjectId()
    mock_user_doc = {
        "_id": user_id,
        "nextauth_id": "user_123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "avatar_url": "https://example.com/avatar.jpg",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()

        mock_db.db.users = MagicMock()
        mock_db.db.users.find_one = AsyncMock(side_effect=[None, mock_user_doc])
        mock_db.db.users.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=user_id)
        )

        async def empty_iter():
            return
            yield

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: empty_iter()
        mock_db.db.invitations = MagicMock()
        mock_db.db.invitations.find = MagicMock(return_value=mock_cursor)

        await handle_user_created(data)

        mock_db.db.users.insert_one.assert_called_once()
        call_args = mock_db.db.users.insert_one.call_args[0][0]
        assert call_args["nextauth_id"] == "user_123"
        assert call_args["email"] == "test@example.com"
        assert call_args["first_name"] == "Test"


@pytest.mark.asyncio
async def test_handle_user_created_auto_joins_org_via_invitation():
    """New user with pending invitations should auto-join the organization."""
    data = _make_clerk_user_data(email="invited@example.com")

    user_id = ObjectId()
    inv_id = ObjectId()

    mock_user_doc = {
        "_id": user_id,
        "nextauth_id": "user_123",
        "email": "invited@example.com",
        "first_name": "Test",
        "last_name": "User",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    invitation = {
        "_id": inv_id,
        "email": "invited@example.com",
        "organization_id": "org-1",
        "role": "MEMBER",
        "house_id": None,
        "accepted_at": None,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=3),
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()

        mock_db.db.users = MagicMock()
        mock_db.db.users.find_one = AsyncMock(side_effect=[None, mock_user_doc])
        mock_db.db.users.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=user_id)
        )

        async def inv_iter():
            yield invitation

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: inv_iter()
        mock_db.db.invitations = MagicMock()
        mock_db.db.invitations.find = MagicMock(return_value=mock_cursor)
        mock_db.db.invitations.update_one = AsyncMock()

        mock_db.db.organization_members = MagicMock()
        mock_db.db.organization_members.find_one = AsyncMock(return_value=None)
        mock_db.db.organization_members.insert_one = AsyncMock()

        await handle_user_created(data)

        mock_db.db.organization_members.insert_one.assert_called_once()
        member_data = mock_db.db.organization_members.insert_one.call_args[0][0]
        assert member_data["organization_id"] == "org-1"
        assert member_data["role"] == "MEMBER"

        mock_db.db.invitations.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_handle_user_created_skips_duplicate_membership():
    """Duplicate membership guard should prevent double-insert."""
    data = _make_clerk_user_data(email="invited@example.com")

    user_id = ObjectId()
    inv_id = ObjectId()

    mock_user_doc = {
        "_id": user_id,
        "nextauth_id": "user_123",
        "email": "invited@example.com",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    invitation = {
        "_id": inv_id,
        "email": "invited@example.com",
        "organization_id": "org-1",
        "role": "MEMBER",
        "house_id": None,
        "accepted_at": None,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=3),
    }

    existing_member = {
        "_id": ObjectId(),
        "user_id": str(user_id),
        "organization_id": "org-1",
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()

        mock_db.db.users = MagicMock()
        mock_db.db.users.find_one = AsyncMock(side_effect=[None, mock_user_doc])
        mock_db.db.users.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=user_id)
        )

        async def inv_iter():
            yield invitation

        mock_cursor = MagicMock()
        mock_cursor.__aiter__ = lambda self: inv_iter()
        mock_db.db.invitations = MagicMock()
        mock_db.db.invitations.find = MagicMock(return_value=mock_cursor)

        mock_db.db.organization_members = MagicMock()
        mock_db.db.organization_members.find_one = AsyncMock(
            return_value=existing_member
        )
        mock_db.db.organization_members.insert_one = AsyncMock()

        await handle_user_created(data)

        # Should NOT insert because membership already exists
        mock_db.db.organization_members.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_handle_user_updated_syncs_to_db():
    data = {
        "id": "user_123",
        "email_addresses": [{"id": "email_1", "email_address": "updated@example.com"}],
        "primary_email_address_id": "email_1",
        "first_name": "Updated",
        "last_name": "User",
        "image_url": "https://example.com/new-avatar.jpg",
    }

    with patch("apps.api.src.auth.webhooks.db") as mock_db:
        mock_db.is_connected.return_value = True
        mock_db.db = MagicMock()
        mock_db.db.users = MagicMock()
        mock_db.db.users.update_one = AsyncMock()

        await handle_user_updated(data)

        mock_db.db.users.update_one.assert_called_once()
        call_args = mock_db.db.users.update_one.call_args
        assert call_args[0][0] == {"nextauth_id": "user_123"}
        assert call_args[0][1]["$set"]["email"] == "updated@example.com"
        assert call_args[0][1]["$set"]["first_name"] == "Updated"
