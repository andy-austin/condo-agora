from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_bulk_setup_creates_org_and_properties():
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()
    mock_org = {
        "_id": "org_id_1",
        "name": "Test Condo",
        "slug": "test-condo",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    rows = [
        {"row_id": "r1", "property_name": "Apto 101"},
        {"row_id": "r2", "property_name": "Apto 102"},
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["organization"]["name"] == "Test Condo"
    assert result["total_properties"] == 2
    assert result["total_residents"] == 0
    assert len(result["rows"]) == 2
    assert all(r["status"] == "SUCCESS" for r in result["rows"])


@pytest.mark.asyncio
async def test_bulk_setup_creates_clerk_users_for_phone_rows():
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()
    mock_org = {
        "_id": "org_id_1",
        "name": "Test Condo",
        "slug": "test-condo",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="local_user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.houses.update_one = AsyncMock()
    mock_clerk_result = {"id": "clerk_user_1", "phone_numbers": []}
    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "first_name": "María",
            "last_name": "García",
            "phone": "+584121234567",
        }
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch(
            "apps.api.src.onboarding.service.create_phone_user",
            new=AsyncMock(return_value=mock_clerk_result),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["total_residents"] == 1
    assert result["rows"][0]["status"] == "SUCCESS"
    assert result["rows"][0]["user_id"] is not None


@pytest.mark.asyncio
async def test_bulk_setup_rejects_over_200_rows():
    rows = [{"row_id": f"r{i}", "property_name": f"Apto {i}"} for i in range(201)]
    with pytest.raises(Exception, match="Maximum 200"):
        from apps.api.src.onboarding.service import bulk_setup_organization

        await bulk_setup_organization("Big Condo", rows, "user_1")


@pytest.mark.asyncio
async def test_bulk_setup_handles_clerk_error_per_row():
    mock_db = MagicMock()
    mock_db.is_connected.return_value = True
    mock_db.db = MagicMock()
    mock_org = {
        "_id": "org_id_1",
        "name": "Test",
        "slug": "test",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    mock_db.db.houses.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="house_1")
    )
    mock_db.db.users.find_one = AsyncMock(return_value=None)
    mock_db.db.users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="local_user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock()
    mock_db.db.houses.update_one = AsyncMock()
    clerk_error = {
        "error": True,
        "status": 422,
        "detail": "Phone already exists",
    }
    clerk_success = {"id": "clerk_user_2"}
    rows = [
        {"row_id": "r1", "property_name": "Apto 101", "phone": "+584121111111"},
        {"row_id": "r2", "property_name": "Apto 102", "phone": "+584122222222"},
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch(
            "apps.api.src.onboarding.service.create_phone_user",
            new=AsyncMock(side_effect=[clerk_error, clerk_success]),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test", rows, "user_1")
    assert result["rows"][0]["status"] == "ERROR"
    assert "Phone already exists" in result["rows"][0]["error"]
    assert result["rows"][1]["status"] == "SUCCESS"
