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
async def test_bulk_setup_creates_local_users_for_phone_rows():
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
    mock_db.db.invitations.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inv_1")
    )
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
        patch("apps.api.src.onboarding.service.db", mock_db),
        patch(
            "apps.api.src.onboarding.service.send_whatsapp_invitation",
            new=AsyncMock(),
        ),
        patch(
            "apps.api.src.onboarding.service.send_email_invitation",
            new=AsyncMock(),
        ),
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
async def test_bulk_setup_invalid_phone_format():
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
    rows = [
        {"row_id": "r1", "property_name": "Apto 101", "phone": "not-a-phone"},
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test", rows, "user_1")
    assert result["rows"][0]["status"] == "ERROR"
    assert "Invalid phone format" in result["rows"][0]["error"]


@pytest.mark.asyncio
async def test_bulk_setup_creates_user_for_email_only_row():
    """When a row has email but no phone, a user should be created by email."""
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
        return_value=MagicMock(inserted_id="user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.houses.update_one = AsyncMock()
    mock_db.db.invitations.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inv_1")
    )
    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "email": "maria@example.com",
        }
    ]
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
        patch(
            "apps.api.src.onboarding.service.send_email_invitation",
            new=AsyncMock(),
        ),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["total_residents"] == 1
    mock_db.db.users.find_one.assert_called()
    mock_db.db.users.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_bulk_setup_sends_dual_channel_invitations():
    """When a row has both phone and email, invitations sent via both channels."""
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
        return_value=MagicMock(inserted_id="user_1")
    )
    mock_db.db.organization_members.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="member_1")
    )
    mock_db.db.houses.update_one = AsyncMock()
    mock_db.db.invitations.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id="inv_1")
    )
    rows = [
        {
            "row_id": "r1",
            "property_name": "Apto 101",
            "first_name": "María",
            "last_name": "López",
            "phone": "+584121234567",
            "email": "maria@example.com",
        }
    ]
    mock_whatsapp = AsyncMock()
    mock_email = AsyncMock()
    with (
        patch(
            "apps.api.src.onboarding.service.create_organization",
            new=AsyncMock(return_value=mock_org),
        ),
        patch("apps.api.src.onboarding.service.db", mock_db),
        patch(
            "apps.api.src.onboarding.service.send_whatsapp_invitation",
            mock_whatsapp,
        ),
        patch("apps.api.src.onboarding.service.send_email_invitation", mock_email),
    ):
        from apps.api.src.onboarding.service import bulk_setup_organization

        result = await bulk_setup_organization("Test Condo", rows, "user_creator")
    assert result["whatsapp_invitations_sent"] == 1
    assert result["email_invitations_sent"] == 1
    mock_whatsapp.assert_called_once()
    mock_email.assert_called_once()


@pytest.mark.asyncio
async def test_bulk_setup_tracks_properties_without_contact():
    """Rows with no phone and no email are counted as properties_without_contact."""
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
    assert result["properties_without_contact"] == 2
    assert result["whatsapp_invitations_sent"] == 0
    assert result["email_invitations_sent"] == 0
