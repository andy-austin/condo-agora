import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

# Mock environment variable before any imports
os.environ["POSTGRES_URL_NON_POOLING"] = "postgresql://test:test@localhost:5432/test_db"

# Create mock note model delegate with proper async mocks
mock_note_delegate = MagicMock()
mock_note_delegate.find_many = AsyncMock(return_value=[])
mock_note_delegate.find_unique = AsyncMock(return_value=None)
mock_note_delegate.create = AsyncMock()
mock_note_delegate.update = AsyncMock()
mock_note_delegate.delete = AsyncMock()

# Create mock house model delegate with proper async mocks
mock_house_delegate = MagicMock()
mock_house_delegate.find_many = AsyncMock(return_value=[])
mock_house_delegate.find_unique = AsyncMock(return_value=None)
mock_house_delegate.find_first = AsyncMock(return_value=None)
mock_house_delegate.create = AsyncMock()
mock_house_delegate.update = AsyncMock()
mock_house_delegate.delete = AsyncMock()
mock_house_delegate.count = AsyncMock(return_value=0)

# Create mock organizationmember delegate
mock_orgmember_delegate = MagicMock()
mock_orgmember_delegate.find_many = AsyncMock(return_value=[])
mock_orgmember_delegate.find_unique = AsyncMock(return_value=None)
mock_orgmember_delegate.find_first = AsyncMock(return_value=None)
mock_orgmember_delegate.create = AsyncMock()
mock_orgmember_delegate.update = AsyncMock()

# Create a shared mock db
mock_db = MagicMock()
mock_db.is_connected.return_value = True
mock_db.connect = AsyncMock()
mock_db.disconnect = AsyncMock()
mock_db.query_raw = AsyncMock(return_value=[{"1": 1}])
mock_db.note = mock_note_delegate
mock_db.house = mock_house_delegate
mock_db.organizationmember = mock_orgmember_delegate

# Patch the database module before importing app
sys.modules["apps.api.database"] = MagicMock()
sys.modules["apps.api.database"].db = mock_db
sys.modules["apps.api.database"].get_db = AsyncMock(return_value=mock_db)


@pytest.fixture
def db_mock():
    """Return the shared mock db for tests that need to configure it"""
    return mock_db


@pytest.fixture
def note_delegate_mock():
    """Return the mock note delegate for tests that need to configure it"""
    return mock_note_delegate


@pytest.fixture
def house_delegate_mock():
    """Return the mock house delegate for tests that need to configure it"""
    return mock_house_delegate


@pytest.fixture
def orgmember_delegate_mock():
    """Return the mock organization member delegate for tests that need to configure it"""
    return mock_orgmember_delegate
