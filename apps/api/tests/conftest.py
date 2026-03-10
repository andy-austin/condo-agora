import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

# Mock environment variables before any imports
os.environ["MONGODB_URI"] = "mongodb://test:test@localhost:27017/test_db"
os.environ["MONGODB_DB_NAME"] = "test_db"


def create_async_cursor_mock(items):
    """Create a mock async cursor that yields items."""
    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = MagicMock(return_value=iter(items))

    async def async_iter():
        for item in items:
            yield item

    mock_cursor.__aiter__ = lambda self: async_iter()
    return mock_cursor


# Create mock collections with Motor-style methods
mock_notes_collection = MagicMock()
mock_notes_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_notes_collection.find_one = AsyncMock(return_value=None)
mock_notes_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_notes_collection.find_one_and_update = AsyncMock(return_value=None)
mock_notes_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
mock_notes_collection.create_index = AsyncMock()

mock_houses_collection = MagicMock()
mock_houses_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_houses_collection.find_one = AsyncMock(return_value=None)
mock_houses_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_houses_collection.find_one_and_update = AsyncMock(return_value=None)
mock_houses_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
mock_houses_collection.count_documents = AsyncMock(return_value=0)
mock_houses_collection.create_index = AsyncMock()

mock_users_collection = MagicMock()
mock_users_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_users_collection.find_one = AsyncMock(return_value=None)
mock_users_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_users_collection.update_one = AsyncMock()
mock_users_collection.find_one_and_update = AsyncMock(return_value=None)
mock_users_collection.create_index = AsyncMock()

mock_organizations_collection = MagicMock()
mock_organizations_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_organizations_collection.find_one = AsyncMock(return_value=None)
mock_organizations_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_organizations_collection.create_index = AsyncMock()

mock_organization_members_collection = MagicMock()
mock_organization_members_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_organization_members_collection.find_one = AsyncMock(return_value=None)
mock_organization_members_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_organization_members_collection.find_one_and_update = AsyncMock(return_value=None)
mock_organization_members_collection.count_documents = AsyncMock(return_value=0)
mock_organization_members_collection.create_index = AsyncMock()

mock_invitations_collection = MagicMock()
mock_invitations_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_invitations_collection.find_one = AsyncMock(return_value=None)
mock_invitations_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_invitations_collection.find_one_and_update = AsyncMock(return_value=None)
mock_invitations_collection.update_one = AsyncMock()
mock_invitations_collection.create_index = AsyncMock()

mock_proposals_collection = MagicMock()
mock_proposals_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_proposals_collection.find_one = AsyncMock(return_value=None)
mock_proposals_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_proposals_collection.find_one_and_update = AsyncMock(return_value=None)
mock_proposals_collection.delete_one = AsyncMock(
    return_value=MagicMock(deleted_count=1)
)
mock_proposals_collection.count_documents = AsyncMock(return_value=0)
mock_proposals_collection.create_index = AsyncMock()

mock_comments_collection = MagicMock()
mock_comments_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_comments_collection.find_one = AsyncMock(return_value=None)
mock_comments_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_comments_collection.find_one_and_update = AsyncMock(return_value=None)
mock_comments_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
mock_comments_collection.delete_many = AsyncMock(
    return_value=MagicMock(deleted_count=0)
)
mock_comments_collection.count_documents = AsyncMock(return_value=0)
mock_comments_collection.create_index = AsyncMock()

mock_announcements_collection = MagicMock()
mock_announcements_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_announcements_collection.find_one = AsyncMock(return_value=None)
mock_announcements_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_announcements_collection.find_one_and_update = AsyncMock(return_value=None)
mock_announcements_collection.delete_one = AsyncMock(
    return_value=MagicMock(deleted_count=1)
)
mock_announcements_collection.create_index = AsyncMock()

mock_notifications_collection = MagicMock()
mock_notifications_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_notifications_collection.find_one = AsyncMock(return_value=None)
mock_notifications_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_notifications_collection.find_one_and_update = AsyncMock(return_value=None)
mock_notifications_collection.update_many = AsyncMock(
    return_value=MagicMock(modified_count=0)
)
mock_notifications_collection.count_documents = AsyncMock(return_value=0)
mock_notifications_collection.create_index = AsyncMock()

mock_voting_sessions_collection = MagicMock()
mock_voting_sessions_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_voting_sessions_collection.find_one = AsyncMock(return_value=None)
mock_voting_sessions_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_voting_sessions_collection.find_one_and_update = AsyncMock(return_value=None)
mock_voting_sessions_collection.create_index = AsyncMock()

mock_votes_collection = MagicMock()
mock_votes_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_votes_collection.find_one = AsyncMock(return_value=None)
mock_votes_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_votes_collection.find_one_and_update = AsyncMock(return_value=None)
mock_votes_collection.create_index = AsyncMock()

mock_documents_collection = MagicMock()
mock_documents_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_documents_collection.find_one = AsyncMock(return_value=None)
mock_documents_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_documents_collection.find_one_and_update = AsyncMock(return_value=None)
mock_documents_collection.update_many = AsyncMock(
    return_value=MagicMock(modified_count=0)
)
mock_documents_collection.delete_one = AsyncMock(
    return_value=MagicMock(deleted_count=1)
)
mock_documents_collection.create_index = AsyncMock()

mock_project_milestones_collection = MagicMock()
mock_project_milestones_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_project_milestones_collection.find_one = AsyncMock(return_value=None)
mock_project_milestones_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_project_milestones_collection.find_one_and_update = AsyncMock(return_value=None)
mock_project_milestones_collection.delete_one = AsyncMock(
    return_value=MagicMock(deleted_count=1)
)
mock_project_milestones_collection.count_documents = AsyncMock(return_value=0)
mock_project_milestones_collection.create_index = AsyncMock()

mock_budgets_collection = MagicMock()
mock_budgets_collection.find = MagicMock(return_value=create_async_cursor_mock([]))
mock_budgets_collection.find_one = AsyncMock(return_value=None)
mock_budgets_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_budgets_collection.find_one_and_update = AsyncMock(return_value=None)
mock_budgets_collection.create_index = AsyncMock()

mock_proposal_votes_collection = MagicMock()
mock_proposal_votes_collection.find = MagicMock(
    return_value=create_async_cursor_mock([])
)
mock_proposal_votes_collection.find_one = AsyncMock(return_value=None)
mock_proposal_votes_collection.insert_one = AsyncMock(
    return_value=MagicMock(inserted_id="mock_id")
)
mock_proposal_votes_collection.find_one_and_update = AsyncMock(return_value=None)
mock_proposal_votes_collection.count_documents = AsyncMock(return_value=0)
mock_proposal_votes_collection.create_index = AsyncMock()

# Create mock database with collections
mock_motor_db = MagicMock()
mock_motor_db.notes = mock_notes_collection
mock_motor_db.houses = mock_houses_collection
mock_motor_db.users = mock_users_collection
mock_motor_db.organizations = mock_organizations_collection
mock_motor_db.organization_members = mock_organization_members_collection
mock_motor_db.invitations = mock_invitations_collection
mock_motor_db.proposals = mock_proposals_collection
mock_motor_db.comments = mock_comments_collection
mock_motor_db.announcements = mock_announcements_collection
mock_motor_db.notifications = mock_notifications_collection
mock_motor_db.voting_sessions = mock_voting_sessions_collection
mock_motor_db.votes = mock_votes_collection
mock_motor_db.documents = mock_documents_collection
mock_motor_db.budgets = mock_budgets_collection
mock_motor_db.project_milestones = mock_project_milestones_collection
mock_motor_db.proposal_votes = mock_proposal_votes_collection
mock_motor_db.__getitem__ = lambda self, key: getattr(self, key)

# Create mock MongoDB client
mock_client = MagicMock()
mock_client.admin.command = AsyncMock(return_value={"ok": 1})
mock_client.close = MagicMock()

# Create mock db wrapper (our MongoDB class)
mock_db = MagicMock()
mock_db.is_connected = MagicMock(return_value=True)
mock_db.connect = AsyncMock()
mock_db.disconnect = AsyncMock()
mock_db.health_check = AsyncMock(return_value=True)
mock_db.db = mock_motor_db
mock_db.client = mock_client
mock_db._connected = True

# Patch the database module before importing app
sys.modules["apps.api.database"] = MagicMock()
sys.modules["apps.api.database"].db = mock_db
sys.modules["apps.api.database"].get_db = AsyncMock(return_value=mock_db)
sys.modules["apps.api.database"].MongoDB = MagicMock(return_value=mock_db)


@pytest.fixture(autouse=True)
def _reset_mocks():
    """Reset all mock collections before each test to avoid state leaking."""
    all_mocks = [
        mock_notes_collection,
        mock_houses_collection,
        mock_users_collection,
        mock_organizations_collection,
        mock_organization_members_collection,
        mock_invitations_collection,
        mock_proposals_collection,
        mock_comments_collection,
        mock_announcements_collection,
        mock_notifications_collection,
        mock_voting_sessions_collection,
        mock_votes_collection,
        mock_documents_collection,
        mock_project_milestones_collection,
        mock_budgets_collection,
        mock_proposal_votes_collection,
    ]
    for m in all_mocks:
        m.reset_mock(side_effect=True, return_value=True)
        # Restore default behaviors
        m.find = MagicMock(return_value=create_async_cursor_mock([]))
        m.find_one = AsyncMock(return_value=None)
        m.insert_one = AsyncMock(return_value=MagicMock(inserted_id="mock_id"))
        m.find_one_and_update = AsyncMock(return_value=None)
        m.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        m.delete_many = AsyncMock(return_value=MagicMock(deleted_count=0))
        m.update_one = AsyncMock()
        m.update_many = AsyncMock(return_value=MagicMock(modified_count=0))
        m.count_documents = AsyncMock(return_value=0)
        m.create_index = AsyncMock()
    yield


@pytest.fixture
def db_mock():
    """Return the shared mock db for tests that need to configure it"""
    return mock_db


@pytest.fixture
def notes_collection_mock():
    """Return the mock notes collection for tests that need to configure it"""
    return mock_notes_collection


@pytest.fixture
def houses_collection_mock():
    """Return the mock houses collection for tests that need to configure it"""
    return mock_houses_collection


@pytest.fixture
def users_collection_mock():
    """Return the mock users collection for tests that need to configure it"""
    return mock_users_collection


@pytest.fixture
def organizations_collection_mock():
    """Return the mock organizations collection for tests that need to configure it"""
    return mock_organizations_collection


@pytest.fixture
def organization_members_collection_mock():
    """Return the mock organization_members collection for tests"""
    return mock_organization_members_collection


@pytest.fixture
def invitations_collection_mock():
    """Return the mock invitations collection for tests that need to configure it"""
    return mock_invitations_collection


@pytest.fixture
def proposals_collection_mock():
    """Return the mock proposals collection for tests that need to configure it"""
    return mock_proposals_collection


@pytest.fixture
def comments_collection_mock():
    """Return the mock comments collection for tests that need to configure it"""
    return mock_comments_collection


@pytest.fixture
def announcements_collection_mock():
    """Return the mock announcements collection for tests that need to configure it"""
    return mock_announcements_collection


@pytest.fixture
def notifications_collection_mock():
    """Return the mock notifications collection for tests that need to configure it"""
    return mock_notifications_collection


@pytest.fixture
def voting_sessions_collection_mock():
    """Return the mock voting_sessions collection for tests that need to configure it"""
    return mock_voting_sessions_collection


@pytest.fixture
def votes_collection_mock():
    """Return the mock votes collection for tests that need to configure it"""
    return mock_votes_collection


@pytest.fixture
def documents_collection_mock():
    """Return the mock documents collection for tests that need to configure it"""
    return mock_documents_collection


@pytest.fixture
def project_milestones_collection_mock():
    """Return the mock project_milestones collection for tests"""
    return mock_project_milestones_collection


@pytest.fixture
def budgets_collection_mock():
    """Return the mock budgets collection for tests"""
    return mock_budgets_collection


@pytest.fixture
def proposal_votes_collection_mock():
    """Return the mock proposal_votes collection for tests"""
    return mock_proposal_votes_collection
