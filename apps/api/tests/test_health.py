from fastapi.testclient import TestClient

from apps.api.i18n import TranslationKeys
from apps.api.index import app

# Import shared mocks from conftest
from .conftest import mock_db

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_endpoint_returns_ok(self):
        """Test that the health endpoint returns OK status"""
        mock_db.health_check.return_value = True

        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["database"] == "mongodb"

    def test_health_endpoint_content_type(self):
        """Test that the health endpoint returns JSON content type"""
        response = client.get("/health")

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]


class TestGraphQLHealthQuery:
    def test_health_query_basic(self):
        """Test basic GraphQL health query"""
        mock_db.is_connected.return_value = True
        mock_db.health_check.return_value = True
        mock_db.health_check.side_effect = None

        query = """
        query {
            health {
                status
                timestamp
                api {
                    status
                }
                database {
                    status
                    connection
                }
            }
        }
        """

        response = client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()

        # Check that we have no errors
        assert "errors" not in data or not data["errors"]

        # Check the structure of the response
        health_data = data["data"]["health"]
        assert "status" in health_data
        assert health_data["status"] == "ok"
        assert "timestamp" in health_data
        assert health_data["database"]["connection"] is True

    def test_health_query_returns_valid_status(self):
        """Test that health query returns valid status values"""
        mock_db.is_connected.return_value = True
        mock_db.health_check.return_value = True
        mock_db.health_check.side_effect = None

        query = """
        query {
            health {
                status
                api {
                    status
                }
                database {
                    status
                }
            }
        }
        """

        response = client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        health_data = data["data"]["health"]

        # Valid status values
        valid_statuses = ["ok", "degraded", "error"]

        assert health_data["status"] in valid_statuses
        assert health_data["api"]["status"] in valid_statuses
        assert health_data["database"]["status"] in valid_statuses

    def test_health_query_details_success(self):
        """Test that health query returns correct translation key on success"""
        mock_db.is_connected.return_value = True
        mock_db.health_check.return_value = True
        mock_db.health_check.side_effect = None

        query = """
        query {
            health {
                database {
                    details
                }
            }
        }
        """

        response = client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data

        details = data["data"]["health"]["database"]["details"]
        assert details == TranslationKeys.DB_CONNECTED

    def test_health_query_details_error(self):
        """Test that health query returns correct translation key on error (no connection)"""
        # Simulate connection error by raising exception
        mock_db.health_check.side_effect = Exception("Connection refused")

        query = """
        query {
            health {
                database {
                    details
                }
            }
        }
        """

        response = client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()

        details = data["data"]["health"]["database"]["details"]
        assert details == TranslationKeys.DB_QUERY_ERROR

        # Reset mock for other tests
        mock_db.health_check.side_effect = None
        mock_db.health_check.return_value = True
