import os
from unittest.mock import MagicMock, AsyncMock, patch

from fastapi.testclient import TestClient

# Mock environment variable before any imports
os.environ["POSTGRES_URL_NON_POOLING"] = "postgresql://test:test@localhost:5432/test_db"

# Mock Prisma to prevent actual connection
with patch("apps.api.prisma_client.Prisma") as mock_prisma:
    mock_prisma.return_value = MagicMock()
    from apps.api.index import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_endpoint_returns_ok(self):
        """Test that the health endpoint returns OK status"""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"ok": True}

    def test_health_endpoint_content_type(self):
        """Test that the health endpoint returns JSON content type"""
        response = client.get("/health")

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]


class TestGraphQLHealthQuery:
    @patch("apps.api.database.db.query_raw", new_callable=AsyncMock)
    @patch("apps.api.database.db.is_connected")
    def test_health_query_basic(self, mock_is_connected, mock_query_raw):
        """Test basic GraphQL health query"""
        mock_is_connected.return_value = True
        mock_query_raw.return_value = [{"1": 1}]

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

    @patch("apps.api.database.db.query_raw", new_callable=AsyncMock)
    @patch("apps.api.database.db.is_connected")
    def test_health_query_returns_valid_status(self, mock_is_connected, mock_query_raw):
        """Test that health query returns valid status values"""
        mock_is_connected.return_value = True
        mock_query_raw.return_value = [{"1": 1}]

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
