from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.src.voting.service import (
    cast_vote,
    create_voting_session,
    get_voting_results,
    get_voting_session,
    get_voting_sessions,
    open_voting_session,
    update_voting_session_proposals,
)

from ..conftest import (
    create_async_cursor_mock,
    mock_houses_collection,
    mock_proposals_collection,
    mock_votes_collection,
    mock_voting_sessions_collection,
)


def _make_session(
    id=None,
    organization_id="org-1",
    title="2024 Vote",
    status="DRAFT",
    proposal_ids=None,
    created_by="admin-1",
):
    return {
        "_id": id or ObjectId(),
        "organization_id": organization_id,
        "title": title,
        "status": status,
        "proposal_ids": proposal_ids or [],
        "start_date": None,
        "end_date": None,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def _make_vote(session_id="session-1", house_id="house-1", rankings=None):
    return {
        "_id": ObjectId(),
        "voting_session_id": session_id,
        "house_id": house_id,
        "voter_id": "user-1",
        "rankings": rankings or [],
        "submitted_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


class TestGetVotingSessions:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self):
        cursor_mock = create_async_cursor_mock([])
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock([]))
        mock_voting_sessions_collection.find.return_value = cursor_mock

        result = await get_voting_sessions("org-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_sessions(self):
        sessions = [_make_session(title="First"), _make_session(title="Second")]
        cursor_mock = create_async_cursor_mock(sessions)
        cursor_mock.sort = MagicMock(return_value=create_async_cursor_mock(sessions))
        mock_voting_sessions_collection.find.return_value = cursor_mock

        result = await get_voting_sessions("org-1")
        assert len(result) == 2


class TestGetVotingSession:
    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_id(self):
        result = await get_voting_session("not-valid")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_session_by_id(self):
        session_id = ObjectId()
        session = _make_session(id=session_id)
        mock_voting_sessions_collection.find_one.return_value = session

        result = await get_voting_session(str(session_id))
        assert result["title"] == "2024 Vote"


class TestCreateVotingSession:
    @pytest.mark.asyncio
    async def test_creates_session(self):
        session_id = ObjectId()
        proposal_ids = ["p1", "p2"]
        created = _make_session(id=session_id, proposal_ids=proposal_ids)
        mock_voting_sessions_collection.insert_one.return_value = MagicMock(
            inserted_id=session_id
        )
        mock_voting_sessions_collection.find_one.return_value = created

        result = await create_voting_session(
            "org-1", "Annual Vote", proposal_ids, "admin-1"
        )
        assert result["title"] == "2024 Vote"
        assert result["status"] == "DRAFT"


class TestUpdateVotingSessionProposals:
    @pytest.mark.asyncio
    async def test_updates_proposals_on_draft(self):
        session_id = ObjectId()
        session = _make_session(id=session_id, status="DRAFT")
        new_proposals = ["p1", "p2", "p3"]
        updated = _make_session(
            id=session_id, status="DRAFT", proposal_ids=new_proposals
        )

        mock_voting_sessions_collection.find_one.return_value = session
        mock_voting_sessions_collection.find_one_and_update.return_value = updated

        result = await update_voting_session_proposals(str(session_id), new_proposals)
        assert result["proposal_ids"] == new_proposals

    @pytest.mark.asyncio
    async def test_raises_on_open_session(self):
        session_id = ObjectId()
        session = _make_session(id=session_id, status="OPEN")
        mock_voting_sessions_collection.find_one.return_value = session

        with pytest.raises(Exception, match="DRAFT"):
            await update_voting_session_proposals(str(session_id), ["p1"])


class TestOpenVotingSession:
    @pytest.mark.asyncio
    async def test_opens_draft_session(self):
        session_id = ObjectId()
        session = _make_session(
            id=session_id, status="DRAFT", proposal_ids=["p1", "p2"]
        )
        opened = _make_session(id=session_id, status="OPEN", proposal_ids=["p1", "p2"])
        mock_voting_sessions_collection.find_one.return_value = session
        mock_voting_sessions_collection.find_one_and_update.return_value = opened

        result = await open_voting_session(str(session_id))
        assert result["status"] == "OPEN"

    @pytest.mark.asyncio
    async def test_raises_on_already_open(self):
        session_id = ObjectId()
        session = _make_session(id=session_id, status="OPEN")
        mock_voting_sessions_collection.find_one.return_value = session

        with pytest.raises(Exception, match="DRAFT"):
            await open_voting_session(str(session_id))

    @pytest.mark.asyncio
    async def test_raises_with_no_proposals(self):
        session_id = ObjectId()
        session = _make_session(id=session_id, status="DRAFT", proposal_ids=[])
        mock_voting_sessions_collection.find_one.return_value = session

        with pytest.raises(Exception, match="proposal"):
            await open_voting_session(str(session_id))


class TestCastVote:
    @pytest.mark.asyncio
    async def test_casts_vote_on_open_session(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        pid1, pid2 = str(ObjectId()), str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1, pid2])
        session["_id"] = (
            ObjectId(session_id) if len(session_id) == 24 else session["_id"]
        )

        house = {
            "_id": ObjectId(house_id),
            "voter_user_id": "user-1",
            "organization_id": "org-1",
        }

        rankings = [
            {"proposal_id": pid1, "rank": 1},
            {"proposal_id": pid2, "rank": 2},
        ]
        vote = _make_vote(session_id=session_id, rankings=rankings)

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.find_one.return_value = house
        mock_votes_collection.find_one.return_value = None  # no existing vote
        mock_votes_collection.insert_one.return_value = MagicMock(
            inserted_id=vote["_id"]
        )
        mock_votes_collection.find_one.side_effect = [None, vote]

        result = await cast_vote(session_id, house_id, "user-1", rankings)
        assert result is not None

    @pytest.mark.asyncio
    async def test_raises_when_session_not_open(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        session = _make_session(status="DRAFT")
        mock_voting_sessions_collection.find_one.return_value = session

        with pytest.raises(Exception, match="not open"):
            await cast_vote(session_id, house_id, "user-1", [])

    @pytest.mark.asyncio
    async def test_raises_on_incomplete_rankings(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        pid1, pid2 = str(ObjectId()), str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1, pid2])

        house = {
            "_id": ObjectId(house_id),
            "voter_user_id": "user-1",
            "organization_id": "org-1",
        }

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.find_one.return_value = house

        with pytest.raises(Exception, match="all proposals"):
            await cast_vote(
                session_id,
                house_id,
                "user-1",
                [{"proposal_id": pid1, "rank": 1}],  # missing pid2
            )


class TestGetVotingResults:
    @pytest.mark.asyncio
    async def test_returns_results_with_no_votes(self):
        session_id = str(ObjectId())
        pid1, pid2 = str(ObjectId()), str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1, pid2])

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.count_documents.return_value = 5
        mock_votes_collection.find.return_value = create_async_cursor_mock([])

        p1 = {"_id": ObjectId(pid1), "title": "Prop A"}
        p2 = {"_id": ObjectId(pid2), "title": "Prop B"}
        mock_proposals_collection.find.return_value = create_async_cursor_mock([p1, p2])

        result = await get_voting_results(session_id)
        assert result["votes_cast"] == 0
        assert result["total_houses"] == 5
        assert result["participation_rate"] == 0.0
        assert len(result["proposal_scores"]) == 2

    @pytest.mark.asyncio
    async def test_raises_when_session_not_found(self):
        mock_voting_sessions_collection.find_one.return_value = None

        with pytest.raises(Exception, match="not found"):
            await get_voting_results(str(ObjectId()))


class TestDesignatedVoterEnforcement:
    @pytest.mark.asyncio
    async def test_designated_voter_can_cast_vote(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        pid1, pid2 = str(ObjectId()), str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1, pid2])

        house = {
            "_id": ObjectId(house_id),
            "voter_user_id": "voter-1",
            "organization_id": "org-1",
        }

        rankings = [
            {"proposal_id": pid1, "rank": 1},
            {"proposal_id": pid2, "rank": 2},
        ]
        vote = _make_vote(session_id=session_id, rankings=rankings)

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.find_one.return_value = house
        mock_votes_collection.find_one.side_effect = [None, vote]
        mock_votes_collection.insert_one.return_value = MagicMock(
            inserted_id=vote["_id"]
        )

        result = await cast_vote(session_id, house_id, "voter-1", rankings)
        assert result is not None

    @pytest.mark.asyncio
    async def test_non_designated_resident_cannot_cast_vote(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        pid1 = str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1])

        house = {
            "_id": ObjectId(house_id),
            "voter_user_id": "voter-1",
            "organization_id": "org-1",
        }

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.find_one.return_value = house

        with pytest.raises(Exception, match="designated voter"):
            await cast_vote(
                session_id,
                house_id,
                "not-the-voter",
                [{"proposal_id": pid1, "rank": 1}],
            )

    @pytest.mark.asyncio
    async def test_house_with_no_voter_cannot_cast_vote(self):
        session_id = str(ObjectId())
        house_id = str(ObjectId())
        pid1 = str(ObjectId())
        session = _make_session(status="OPEN", proposal_ids=[pid1])

        house = {
            "_id": ObjectId(house_id),
            "voter_user_id": None,
            "organization_id": "org-1",
        }

        mock_voting_sessions_collection.find_one.return_value = session
        mock_houses_collection.find_one.return_value = house

        with pytest.raises(Exception, match="No designated voter"):
            await cast_vote(
                session_id,
                house_id,
                "user-1",
                [{"proposal_id": pid1, "rank": 1}],
            )
