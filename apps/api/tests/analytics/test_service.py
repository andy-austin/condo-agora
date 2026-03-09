from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.analytics.service import (
    get_community_analytics,
    get_participation_report,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_comments_collection,
    mock_houses_collection,
    mock_proposals_collection,
    mock_votes_collection,
    mock_voting_sessions_collection,
)


class TestGetCommunityAnalytics:
    @pytest.mark.asyncio
    async def test_returns_analytics_with_no_data(self):
        mock_proposals_collection.find.return_value = create_async_cursor_mock([])
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=cursor_mock)
        cursor_mock.limit = MagicMock(return_value=create_async_cursor_mock([]))
        mock_voting_sessions_collection.find.return_value = cursor_mock

        result = await get_community_analytics("org-1")
        assert result["total_proposals"] == 0
        assert result["approval_rate"] == 0.0
        assert result["category_breakdown"] == []
        assert result["monthly_trends"] == []
        assert result["top_contributors"] == []

    @pytest.mark.asyncio
    async def test_returns_analytics_with_proposals(self):
        proposals = [
            {
                "_id": ObjectId(),
                "status": "APPROVED",
                "category": "SECURITY",
                "author_id": "user-1",
                "organization_id": "org-1",
                "created_at": datetime(2024, 1, 15, tzinfo=timezone.utc),
            },
            {
                "_id": ObjectId(),
                "status": "REJECTED",
                "category": "INFRASTRUCTURE",
                "author_id": "user-2",
                "organization_id": "org-1",
                "created_at": datetime(2024, 2, 10, tzinfo=timezone.utc),
            },
        ]
        # First call: status/category/monthly counts
        # Second call: top contributors proposals
        # Third call: proposal IDs for comments
        mock_proposals_collection.find.side_effect = [
            create_async_cursor_mock(proposals),
            create_async_cursor_mock(proposals),
            create_async_cursor_mock(proposals),
        ]
        mock_comments_collection.find.return_value = create_async_cursor_mock([])

        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=cursor_mock)
        cursor_mock.limit = MagicMock(return_value=create_async_cursor_mock([]))
        mock_voting_sessions_collection.find.return_value = cursor_mock

        result = await get_community_analytics("org-1")
        assert result["total_proposals"] == 2
        assert result["approved_proposals"] == 1
        assert result["rejected_proposals"] == 1
        assert len(result["category_breakdown"]) == 2


class TestGetParticipationReport:
    @pytest.mark.asyncio
    async def test_returns_report(self):
        session_id = ObjectId()
        session = {
            "_id": session_id,
            "title": "2024 Vote",
            "organization_id": "org-1",
            "status": "CLOSED",
        }
        mock_voting_sessions_collection.find_one.return_value = session

        houses = [
            {"_id": ObjectId(), "organization_id": "org-1"},
            {"_id": ObjectId(), "organization_id": "org-1"},
            {"_id": ObjectId(), "organization_id": "org-1"},
        ]
        mock_houses_collection.find.return_value = create_async_cursor_mock(houses)

        votes = [
            {"_id": ObjectId(), "house_id": str(houses[0]["_id"])},
            {"_id": ObjectId(), "house_id": str(houses[1]["_id"])},
        ]
        mock_votes_collection.find.return_value = create_async_cursor_mock(votes)

        result = await get_participation_report(str(session_id))
        assert result["total_houses"] == 3
        assert result["votes_cast"] == 2
        assert len(result["voted_house_ids"]) == 2
        assert len(result["non_voted_house_ids"]) == 1

    @pytest.mark.asyncio
    async def test_raises_when_session_not_found(self):
        mock_voting_sessions_collection.find_one.return_value = None
        with pytest.raises(Exception, match="not found"):
            await get_participation_report(str(ObjectId()))
