from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId

from apps.api.tests.conftest import mock_users_collection


@pytest.mark.asyncio
async def test_complete_profile_updates_email():
    from apps.api.src.auth.service import complete_user_profile

    user_id = ObjectId()
    now = datetime.now(timezone.utc)
    mock_user = {
        "_id": user_id,
        "nextauth_id": "na-1",
        "email": "old@example.com",
        "phone": "+59899123456",
        "auth_provider": "phone",
        "first_name": "Test",
        "last_name": "User",
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    }

    mock_users_collection.find_one = AsyncMock(return_value=mock_user)
    mock_users_collection.update_one = AsyncMock()

    await complete_user_profile(
        user_id=str(user_id),
        first_name="Updated",
        last_name=None,
        email="new@example.com",
    )

    call_args = mock_users_collection.update_one.call_args
    update_set = call_args[0][1]["$set"]
    assert update_set["first_name"] == "Updated"
    assert update_set["email"] == "new@example.com"
    assert "last_name" not in update_set


@pytest.mark.asyncio
async def test_complete_profile_updates_avatar_url():
    from apps.api.src.auth.service import complete_user_profile

    user_id = ObjectId()
    now = datetime.now(timezone.utc)
    mock_user = {
        "_id": user_id,
        "nextauth_id": "na-2",
        "email": "test@example.com",
        "phone": None,
        "auth_provider": "email",
        "first_name": "Test",
        "last_name": "User",
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    }

    mock_users_collection.find_one = AsyncMock(return_value=mock_user)
    mock_users_collection.update_one = AsyncMock()

    await complete_user_profile(
        user_id=str(user_id),
        avatar_url="https://blob.vercel-storage.com/avatar-abc.jpg",
    )

    call_args = mock_users_collection.update_one.call_args
    update_set = call_args[0][1]["$set"]
    assert update_set["avatar_url"] == "https://blob.vercel-storage.com/avatar-abc.jpg"


@pytest.mark.asyncio
async def test_complete_profile_invalid_email_raises():
    from apps.api.src.auth.service import complete_user_profile

    user_id = ObjectId()
    now = datetime.now(timezone.utc)
    mock_user = {
        "_id": user_id,
        "nextauth_id": "na-3",
        "email": "old@example.com",
        "created_at": now,
        "updated_at": now,
    }

    mock_users_collection.find_one = AsyncMock(return_value=mock_user)

    with pytest.raises(Exception, match="Invalid email"):
        await complete_user_profile(
            user_id=str(user_id),
            email="not-an-email",
        )


@pytest.mark.asyncio
async def test_complete_profile_user_not_found_raises():
    from apps.api.src.auth.service import complete_user_profile

    mock_users_collection.find_one = AsyncMock(return_value=None)

    with pytest.raises(Exception, match="User not found"):
        await complete_user_profile(user_id=str(ObjectId()))
