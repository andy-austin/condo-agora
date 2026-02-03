from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.house.service import (
    assign_resident_to_house,
    create_house,
    delete_house,
    get_house,
    get_houses,
    get_houses_count,
    remove_resident_from_house,
    update_house,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_houses_collection,
    mock_organization_members_collection,
    mock_organizations_collection,
)


def _make_mock_house_doc(
    id=None,
    name="Unit 101",
    organization_id="org-1",
    residents=None,
):
    """Create a mock house document (MongoDB-style dict)"""
    return {
        "_id": id or ObjectId(),
        "name": name,
        "organization_id": organization_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "residents": residents or [],
    }


def _make_mock_member_doc(
    id=None,
    user_id="user-1",
    organization_id="org-1",
    house_id=None,
    role="MEMBER",
):
    """Create a mock organization member document (MongoDB-style dict)"""
    return {
        "_id": id or ObjectId(),
        "user_id": user_id,
        "organization_id": organization_id,
        "house_id": house_id,
        "role": role,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def _make_mock_org_doc(id=None, name="Test Org", slug="test-org"):
    """Create a mock organization document (MongoDB-style dict)"""
    return {
        "_id": id or ObjectId(),
        "name": name,
        "slug": slug,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetHouses:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_houses(self):
        mock_houses_collection.find.return_value = create_async_cursor_mock([])
        mock_houses_collection.find.return_value.sort = MagicMock(
            return_value=create_async_cursor_mock([])
        )
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([])
        )

        result = await get_houses("org-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_houses_for_organization(self):
        houses = [
            _make_mock_house_doc(name="Unit 101"),
            _make_mock_house_doc(name="Unit 202"),
        ]

        cursor_mock = create_async_cursor_mock(houses)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(houses))
        mock_houses_collection.find.return_value = cursor_mock
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([])
        )

        result = await get_houses("org-1")
        assert len(result) == 2
        assert result[0]["name"] == "Unit 101"
        assert result[1]["name"] == "Unit 202"


class TestGetHouse:
    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_houses_collection.find_one.return_value = None
        result = await get_house("507f1f77bcf86cd799439011")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_house_by_id(self):
        house_id = ObjectId()
        house = _make_mock_house_doc(id=house_id, name="Unit 101")
        mock_houses_collection.find_one.return_value = house
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([])
        )

        result = await get_house(str(house_id))
        assert result["name"] == "Unit 101"


class TestCreateHouse:
    @pytest.mark.asyncio
    async def test_creates_house(self):
        house_id = ObjectId()
        created = _make_mock_house_doc(id=house_id, name="Unit 101")
        mock_houses_collection.insert_one.return_value = MagicMock(inserted_id=house_id)
        mock_houses_collection.find_one.return_value = created

        result = await create_house("org-1", "Unit 101")
        assert result["name"] == "Unit 101"
        mock_houses_collection.insert_one.assert_called_once()


class TestUpdateHouse:
    @pytest.mark.asyncio
    async def test_updates_house_name(self):
        house_id = ObjectId()
        updated = _make_mock_house_doc(id=house_id, name="Unit 102")
        mock_houses_collection.find_one_and_update.return_value = updated
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([])
        )

        result = await update_house(str(house_id), "Unit 102")
        assert result["name"] == "Unit 102"


class TestDeleteHouse:
    @pytest.mark.asyncio
    async def test_deletes_house_with_no_residents(self):
        house_id = ObjectId()
        house = _make_mock_house_doc(id=house_id, residents=[])
        mock_houses_collection.find_one.return_value = house
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([])
        )
        mock_houses_collection.delete_one.return_value = MagicMock(deleted_count=1)

        result = await delete_house(str(house_id))
        assert result is True

    @pytest.mark.asyncio
    async def test_raises_when_house_has_residents(self):
        house_id = ObjectId()
        member = _make_mock_member_doc()
        house = _make_mock_house_doc(id=house_id)
        mock_houses_collection.find_one.return_value = house
        mock_organization_members_collection.find.return_value = (
            create_async_cursor_mock([member])
        )

        with pytest.raises(
            Exception, match="Cannot delete a house with assigned residents"
        ):
            await delete_house(str(house_id))

    @pytest.mark.asyncio
    async def test_raises_when_house_not_found(self):
        mock_houses_collection.find_one.return_value = None
        with pytest.raises(Exception, match="House not found"):
            await delete_house("507f1f77bcf86cd799439011")


class TestAssignResidentToHouse:
    @pytest.mark.asyncio
    async def test_assigns_resident(self):
        house_id = ObjectId()
        member_id = ObjectId()
        org_id = ObjectId()

        house = _make_mock_house_doc(id=house_id, organization_id=str(org_id))
        member = _make_mock_member_doc(
            id=member_id, organization_id=str(org_id), user_id="user-1"
        )
        org = _make_mock_org_doc(id=org_id)

        mock_houses_collection.find_one.return_value = house
        mock_organization_members_collection.find_one.return_value = member

        updated_member = _make_mock_member_doc(
            id=member_id, organization_id=str(org_id), house_id=str(house_id)
        )
        mock_organization_members_collection.find_one_and_update.return_value = (
            updated_member
        )
        mock_organizations_collection.find_one.return_value = org

        result = await assign_resident_to_house("user-1", str(house_id))
        assert result["house_id"] == str(house_id)

    @pytest.mark.asyncio
    async def test_raises_when_house_not_found(self):
        mock_houses_collection.find_one.return_value = None
        with pytest.raises(Exception, match="House not found"):
            await assign_resident_to_house("user-1", "507f1f77bcf86cd799439011")

    @pytest.mark.asyncio
    async def test_raises_when_user_not_member(self):
        house_id = ObjectId()
        house = _make_mock_house_doc(id=house_id)
        mock_houses_collection.find_one.return_value = house
        mock_organization_members_collection.find_one.return_value = None

        with pytest.raises(Exception, match="User is not a member"):
            await assign_resident_to_house("user-999", str(house_id))


class TestRemoveResidentFromHouse:
    @pytest.mark.asyncio
    async def test_removes_resident(self):
        member_id = ObjectId()
        org_id = ObjectId()

        member = _make_mock_member_doc(
            id=member_id, organization_id=str(org_id), house_id="house-1"
        )
        mock_organization_members_collection.find_one.return_value = member

        updated_member = _make_mock_member_doc(
            id=member_id, organization_id=str(org_id), house_id=None
        )
        mock_organization_members_collection.find_one_and_update.return_value = (
            updated_member
        )

        org = _make_mock_org_doc(id=org_id)
        mock_organizations_collection.find_one.return_value = org

        result = await remove_resident_from_house("user-1", str(org_id))
        assert result["house_id"] is None

    @pytest.mark.asyncio
    async def test_raises_when_user_not_member(self):
        mock_organization_members_collection.find_one.return_value = None
        with pytest.raises(Exception, match="User is not a member"):
            await remove_resident_from_house("user-999", "org-1")

    @pytest.mark.asyncio
    async def test_raises_when_user_not_assigned(self):
        member = _make_mock_member_doc(house_id=None)
        mock_organization_members_collection.find_one.return_value = member
        with pytest.raises(Exception, match="User is not assigned to any house"):
            await remove_resident_from_house("user-1", "org-1")


class TestGetHousesCount:
    @pytest.mark.asyncio
    async def test_returns_count(self):
        mock_houses_collection.count_documents.return_value = 3
        result = await get_houses_count("org-1")
        assert result == 3
