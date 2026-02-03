from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from apps.api.index import app

# Import shared mocks from conftest
from .conftest import create_async_cursor_mock, mock_db, mock_notes_collection

client = TestClient(app)


@pytest.fixture
def mock_note_doc():
    """Create a mock note document (MongoDB-style dict)"""
    return {
        "_id": ObjectId(),
        "title": "Test Note",
        "content": "Test content",
        "is_published": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestNoteGraphQLEndpoints:
    def test_notes_query_accessible(self):
        """Test that notes query is accessible via GraphQL"""
        mock_db.is_connected.return_value = True
        mock_notes_collection.find.return_value = create_async_cursor_mock([])

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

    def test_note_by_id_query_accessible(self):
        """Test that note by ID query is accessible via GraphQL"""
        mock_db.is_connected.return_value = True
        mock_notes_collection.find_one.return_value = None  # Non-existent note

        query = """
        query {
            note(id: "507f1f77bcf86cd799439011") {
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

    def test_create_note_mutation_accessible(self, mock_note_doc):
        """Test that create note mutation is accessible via GraphQL"""
        mock_db.is_connected.return_value = True
        mock_notes_collection.insert_one.return_value = MagicMock(
            inserted_id=mock_note_doc["_id"]
        )

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

        # Check that we got a valid response
        assert created_note is not None
        assert "id" in created_note

    def test_graphql_schema_includes_note_types(self):
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
