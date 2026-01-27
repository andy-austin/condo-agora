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

# Create a shared mock db
mock_db = MagicMock()
mock_db.is_connected.return_value = True
mock_db.connect = AsyncMock()
mock_db.disconnect = AsyncMock()
mock_db.query_raw = AsyncMock(return_value=[{"1": 1}])
mock_db.note = mock_note_delegate

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
