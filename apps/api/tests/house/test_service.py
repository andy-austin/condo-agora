from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

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
from ..conftest import mock_db, mock_house_delegate, mock_orgmember_delegate


def _make_mock_house(
    id="house-1",
    name="Unit 101",
    organization_id="org-1",
    residents=None,
):
    house = MagicMock()
    house.id = id
    house.name = name
    house.organizationId = organization_id
    house.createdAt = datetime.now(timezone.utc)
    house.updatedAt = datetime.now(timezone.utc)
    house.residents = residents or []
    return house


def _make_mock_member(
    id="mem-1",
    user_id="user-1",
    organization_id="org-1",
    house_id=None,
    role_name="MEMBER",
):
    member = MagicMock()
    member.id = id
    member.userId = user_id
    member.organizationId = organization_id
    member.houseId = house_id
    member.role = MagicMock()
    member.role.name = role_name
    member.createdAt = datetime.now(timezone.utc)
    member.organization = MagicMock()
    member.organization.id = organization_id
    member.organization.name = "Test Org"
    member.organization.slug = "test-org"
    member.organization.createdAt = datetime.now(timezone.utc)
    member.organization.updatedAt = datetime.now(timezone.utc)
    member.house = None
    return member


class TestGetHouses:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_houses(self):
        mock_house_delegate.find_many.return_value = []
        result = await get_houses("org-1")
        assert result == []
        mock_house_delegate.find_many.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_houses_for_organization(self):
        houses = [_make_mock_house(id="h1"), _make_mock_house(id="h2", name="Unit 202")]
        mock_house_delegate.find_many.return_value = houses
        result = await get_houses("org-1")
        assert len(result) == 2
        assert result[0].id == "h1"
        assert result[1].name == "Unit 202"


class TestGetHouse:
    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_house_delegate.find_unique.return_value = None
        result = await get_house("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_house_by_id(self):
        house = _make_mock_house()
        mock_house_delegate.find_unique.return_value = house
        result = await get_house("house-1")
        assert result.id == "house-1"
        assert result.name == "Unit 101"


class TestCreateHouse:
    @pytest.mark.asyncio
    async def test_creates_house(self):
        created = _make_mock_house()
        mock_house_delegate.create.return_value = created
        result = await create_house("org-1", "Unit 101")
        assert result.id == "house-1"
        assert result.name == "Unit 101"
        mock_house_delegate.create.assert_called_once_with(
            data={"name": "Unit 101", "organizationId": "org-1"},
            include={"residents": True},
        )


class TestUpdateHouse:
    @pytest.mark.asyncio
    async def test_updates_house_name(self):
        updated = _make_mock_house(name="Unit 102")
        mock_house_delegate.update.return_value = updated
        result = await update_house("house-1", "Unit 102")
        assert result.name == "Unit 102"
        mock_house_delegate.update.assert_called_once_with(
            where={"id": "house-1"},
            data={"name": "Unit 102"},
            include={"residents": True},
        )


class TestDeleteHouse:
    @pytest.mark.asyncio
    async def test_deletes_house_with_no_residents(self):
        house = _make_mock_house(residents=[])
        mock_house_delegate.find_unique.return_value = house
        mock_house_delegate.delete.return_value = None
        result = await delete_house("house-1")
        assert result is True
        mock_house_delegate.delete.assert_called_once_with(
            where={"id": "house-1"}
        )

    @pytest.mark.asyncio
    async def test_raises_when_house_has_residents(self):
        member = _make_mock_member()
        house = _make_mock_house(residents=[member])
        mock_house_delegate.find_unique.return_value = house
        with pytest.raises(Exception, match="Cannot delete a house with assigned residents"):
            await delete_house("house-1")

    @pytest.mark.asyncio
    async def test_raises_when_house_not_found(self):
        mock_house_delegate.find_unique.return_value = None
        with pytest.raises(Exception, match="House not found"):
            await delete_house("nonexistent")


class TestAssignResidentToHouse:
    @pytest.mark.asyncio
    async def test_assigns_resident(self):
        house = _make_mock_house()
        mock_house_delegate.find_unique.return_value = house
        member = _make_mock_member()
        mock_orgmember_delegate.find_first.return_value = member
        updated_member = _make_mock_member(house_id="house-1")
        mock_orgmember_delegate.update.return_value = updated_member

        result = await assign_resident_to_house("user-1", "house-1")
        assert result.houseId == "house-1"
        mock_orgmember_delegate.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_when_house_not_found(self):
        mock_house_delegate.find_unique.return_value = None
        with pytest.raises(Exception, match="House not found"):
            await assign_resident_to_house("user-1", "nonexistent")

    @pytest.mark.asyncio
    async def test_raises_when_user_not_member(self):
        house = _make_mock_house()
        mock_house_delegate.find_unique.return_value = house
        mock_orgmember_delegate.find_first.return_value = None
        with pytest.raises(Exception, match="User is not a member"):
            await assign_resident_to_house("user-999", "house-1")


class TestRemoveResidentFromHouse:
    @pytest.mark.asyncio
    async def test_removes_resident(self):
        member = _make_mock_member(house_id="house-1")
        mock_orgmember_delegate.find_first.return_value = member
        updated_member = _make_mock_member(house_id=None)
        mock_orgmember_delegate.update.return_value = updated_member

        result = await remove_resident_from_house("user-1", "org-1")
        assert result.houseId is None

    @pytest.mark.asyncio
    async def test_raises_when_user_not_member(self):
        mock_orgmember_delegate.find_first.return_value = None
        with pytest.raises(Exception, match="User is not a member"):
            await remove_resident_from_house("user-999", "org-1")

    @pytest.mark.asyncio
    async def test_raises_when_user_not_assigned(self):
        member = _make_mock_member(house_id=None)
        mock_orgmember_delegate.find_first.return_value = member
        with pytest.raises(Exception, match="User is not assigned to any house"):
            await remove_resident_from_house("user-1", "org-1")


class TestGetHousesCount:
    @pytest.mark.asyncio
    async def test_returns_count(self):
        mock_house_delegate.count.return_value = 3
        result = await get_houses_count("org-1")
        assert result == 3
