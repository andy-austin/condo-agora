import os
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Mock environment variable before any imports
os.environ["POSTGRES_URL_NON_POOLING"] = "postgresql://test:test@localhost:5432/test_db"

# Mock Prisma before any imports that might trigger connection
with patch("prisma.Prisma") as mock_prisma:
    mock_instance = MagicMock()
    mock_instance.is_connected.return_value = True
    mock_prisma.return_value = mock_instance
    from apps.api.index import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def mock_note():
    """Create a mock note object"""
    note = MagicMock()
    note.id = 1
    note.title = "Test Note"
    note.content = "Test content"
    note.isPublished = False
    note.createdAt = datetime.now(timezone.utc)
    note.updatedAt = datetime.now(timezone.utc)
    return note


class TestNoteGraphQLEndpoints:
    @patch("apps.api.database.db.note.find_many", new_callable=AsyncMock)
    @patch("apps.api.database.db.is_connected")
    def test_notes_query_accessible(self, mock_is_connected, mock_find_many, client):
        """Test that notes query is accessible via GraphQL"""
        mock_is_connected.return_value = True
        mock_find_many.return_value = []

        query = """
        query {
            notes {
                id
                title
                content
                isPublished
                createdAt
                updatedAt
            }
        }
        """

        response = client.post("/graphql", json={"query": query})
        assert response.status_code == 200

        data = response.json()
        assert "errors" not in data or not data["errors"]
        assert "data" in data
        assert "notes" in data["data"]
        assert isinstance(data["data"]["notes"], list)

    @patch("apps.api.database.db.note.find_unique", new_callable=AsyncMock)
    @patch("apps.api.database.db.is_connected")
    def test_note_by_id_query_accessible(self, mock_is_connected, mock_find_unique, client):
        """Test that note by ID query is accessible via GraphQL"""
        mock_is_connected.return_value = True
        mock_find_unique.return_value = None  # Non-existent note

        query = """
        query {
            note(id: 999) {
                id
                title
                content
                isPublished
            }
        }
        """

        response = client.post("/graphql", json={"query": query})
        assert response.status_code == 200

        data = response.json()
        assert "errors" not in data or not data["errors"]
        assert "data" in data
        assert "note" in data["data"]
        assert data["data"]["note"] is None

    @patch("apps.api.database.db.note.create", new_callable=AsyncMock)
    @patch("apps.api.database.db.is_connected")
    def test_create_note_mutation_accessible(self, mock_is_connected, mock_create, client, mock_note):
        """Test that create note mutation is accessible via GraphQL"""
        mock_is_connected.return_value = True
        mock_create.return_value = mock_note

        mutation = """
        mutation {
            createNote(input: {
                title: "Test Note from GraphQL"
                content: "This is a test note created via GraphQL mutation"
                isPublished: false
            }) {
                id
                title
                content
                isPublished
            }
        }
        """

        response = client.post("/graphql", json={"query": mutation})
        assert response.status_code == 200

        data = response.json()
        assert "errors" not in data or not data["errors"]
        assert "data" in data
        assert "createNote" in data["data"]
        created_note = data["data"]["createNote"]

        assert created_note["title"] == "Test Note"

    def test_graphql_schema_includes_note_types(self, client):
        """Test that GraphQL schema includes note-related types"""
        introspection_query = """
        query {
            __schema {
                types {
                    name
                }
            }
        }
        """

        response = client.post("/graphql", json={"query": introspection_query})
        assert response.status_code == 200

        data = response.json()
        assert "errors" not in data or not data["errors"]

        type_names = [t["name"] for t in data["data"]["__schema"]["types"]]

        assert "Note" in type_names
        assert "CreateNoteInput" in type_names
        assert "UpdateNoteInput" in type_names