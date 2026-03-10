from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from ..conftest import (
    mock_houses_collection,
    mock_proposal_votes_collection,
    mock_proposals_collection,
)

# Import after conftest has patched the database module
from apps.api.src.proposal_vote.service import (
    _check_auto_approval,
    cast_proposal_vote,
    close_proposal_vote,
    get_my_proposal_vote,
    get_proposal_vote_results,
    start_proposal_vote,
)

PROPOSAL_ID = str(ObjectId())
HOUSE_ID_1 = str(ObjectId())
HOUSE_ID_2 = str(ObjectId())
HOUSE_ID_3 = str(ObjectId())
VOTER_ID = "voter_user_1"
ADMIN_ID = "admin_user_1"
ORG_ID = "org_1"


def _make_proposal(
    status="VOTING", vote_status=None, vote_threshold=None, proposal_id=None
):
    return {
        "_id": ObjectId(proposal_id or PROPOSAL_ID),
        "title": "Test Proposal",
        "description": "Test",
        "category": "OTHER",
        "status": status,
        "author_id": "author_1",
        "organization_id": ORG_ID,
        "vote_status": vote_status,
        "vote_threshold": vote_threshold,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def _make_house(house_id, voter_user_id=None):
    return {
        "_id": ObjectId(house_id),
        "name": f"House {house_id[:4]}",
        "organization_id": ORG_ID,
        "voter_user_id": voter_user_id,
    }


def _make_vote(proposal_id, house_id, voter_id, vote="YES"):
    return {
        "_id": ObjectId(),
        "proposal_id": proposal_id,
        "house_id": house_id,
        "voter_id": voter_id,
        "vote": vote,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


class TestStartProposalVote:
    @pytest.mark.asyncio
    async def test_start_vote_happy_path(self):
        proposal = _make_proposal()
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        updated = {**proposal, "vote_status": "ACTIVE", "vote_threshold": 66}
        mock_proposals_collection.find_one_and_update = AsyncMock(
            return_value=updated
        )

        result = await start_proposal_vote(PROPOSAL_ID, 66, ADMIN_ID)
        assert result["vote_status"] == "ACTIVE"
        assert result["vote_threshold"] == 66

    @pytest.mark.asyncio
    async def test_start_vote_fails_if_not_voting_status(self):
        proposal = _make_proposal(status="DRAFT")
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)

        with pytest.raises(Exception, match="must be in VOTING status"):
            await start_proposal_vote(PROPOSAL_ID, 66, ADMIN_ID)

    @pytest.mark.asyncio
    async def test_start_vote_fails_if_already_active(self):
        proposal = _make_proposal(vote_status="ACTIVE")
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)

        with pytest.raises(Exception, match="already active"):
            await start_proposal_vote(PROPOSAL_ID, 66, ADMIN_ID)


class TestCastProposalVote:
    @pytest.mark.asyncio
    async def test_cast_yes_vote(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        house = _make_house(HOUSE_ID_1, voter_user_id=VOTER_ID)
        vote_doc = _make_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")

        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.find_one = AsyncMock(return_value=house)
        mock_proposal_votes_collection.find_one = AsyncMock(
            side_effect=[None, vote_doc]
        )
        mock_proposal_votes_collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=vote_doc["_id"])
        )
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        mock_proposal_votes_collection.count_documents = AsyncMock(return_value=1)

        result = await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")
        assert result["vote"] == "YES"

    @pytest.mark.asyncio
    async def test_cast_no_vote(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        house = _make_house(HOUSE_ID_1, voter_user_id=VOTER_ID)
        vote_doc = _make_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "NO")

        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.find_one = AsyncMock(return_value=house)
        mock_proposal_votes_collection.find_one = AsyncMock(
            side_effect=[None, vote_doc]
        )
        mock_proposal_votes_collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=vote_doc["_id"])
        )
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        mock_proposal_votes_collection.count_documents = AsyncMock(return_value=0)

        result = await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "NO")
        assert result["vote"] == "NO"

    @pytest.mark.asyncio
    async def test_change_vote_upsert(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        house = _make_house(HOUSE_ID_1, voter_user_id=VOTER_ID)
        existing_vote = _make_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "NO")
        updated_vote = {**existing_vote, "vote": "YES"}

        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.find_one = AsyncMock(return_value=house)
        mock_proposal_votes_collection.find_one = AsyncMock(
            return_value=existing_vote
        )
        mock_proposal_votes_collection.find_one_and_update = AsyncMock(
            return_value=updated_vote
        )
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        mock_proposal_votes_collection.count_documents = AsyncMock(return_value=1)

        result = await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")
        assert result["vote"] == "YES"

    @pytest.mark.asyncio
    async def test_fails_for_non_designated_voter(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        house = _make_house(HOUSE_ID_1, voter_user_id="other_voter")

        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.find_one = AsyncMock(return_value=house)

        with pytest.raises(Exception, match="designated voter"):
            await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")

    @pytest.mark.asyncio
    async def test_fails_if_vote_not_active(self):
        proposal = _make_proposal(vote_status=None)
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)

        with pytest.raises(Exception, match="No active vote"):
            await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")

    @pytest.mark.asyncio
    async def test_fails_for_invalid_vote_value(self):
        proposal = _make_proposal(vote_status="ACTIVE")
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)

        with pytest.raises(Exception, match="must be YES or NO"):
            await cast_proposal_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "MAYBE")


class TestCheckAutoApproval:
    @pytest.mark.asyncio
    async def test_auto_approve_when_threshold_met(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        # 2 out of 3 = 66.7% >= 66%
        mock_proposal_votes_collection.count_documents = AsyncMock(return_value=2)

        await _check_auto_approval(PROPOSAL_ID)
        mock_proposals_collection.update_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_approval_below_threshold(self):
        proposal = _make_proposal(vote_status="ACTIVE", vote_threshold=66)
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        # 1 out of 3 = 33.3% < 66%
        mock_proposal_votes_collection.count_documents = AsyncMock(return_value=1)

        await _check_auto_approval(PROPOSAL_ID)
        mock_proposals_collection.update_one.assert_not_called()


class TestCloseProposalVote:
    @pytest.mark.asyncio
    async def test_close_vote_rejects_if_threshold_not_met(self):
        proposal = _make_proposal(
            status="VOTING", vote_status="ACTIVE", vote_threshold=66
        )
        closed = {**proposal, "vote_status": "CLOSED", "status": "REJECTED"}
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_proposals_collection.find_one_and_update = AsyncMock(
            return_value=closed
        )

        result = await close_proposal_vote(PROPOSAL_ID, ADMIN_ID)
        assert result["vote_status"] == "CLOSED"
        assert result["status"] == "REJECTED"

    @pytest.mark.asyncio
    async def test_close_vote_keeps_approved(self):
        proposal = _make_proposal(
            status="APPROVED", vote_status="ACTIVE", vote_threshold=66
        )
        closed = {**proposal, "vote_status": "CLOSED"}
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_proposals_collection.find_one_and_update = AsyncMock(
            return_value=closed
        )

        result = await close_proposal_vote(PROPOSAL_ID, ADMIN_ID)
        assert result["vote_status"] == "CLOSED"
        # The update should not have changed status to REJECTED
        call_args = mock_proposals_collection.find_one_and_update.call_args
        update_fields = call_args[0][1]["$set"]
        assert "status" not in update_fields

    @pytest.mark.asyncio
    async def test_close_vote_fails_if_not_active(self):
        proposal = _make_proposal(vote_status=None)
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)

        with pytest.raises(Exception, match="No active vote"):
            await close_proposal_vote(PROPOSAL_ID, ADMIN_ID)


class TestGetProposalVoteResults:
    @pytest.mark.asyncio
    async def test_get_results(self):
        proposal = _make_proposal(
            status="VOTING", vote_status="ACTIVE", vote_threshold=66
        )
        mock_proposals_collection.find_one = AsyncMock(return_value=proposal)
        mock_houses_collection.count_documents = AsyncMock(return_value=3)
        # yes_count=2, no_count=1
        mock_proposal_votes_collection.count_documents = AsyncMock(
            side_effect=[2, 1]
        )

        result = await get_proposal_vote_results(PROPOSAL_ID)
        assert result["yes_count"] == 2
        assert result["no_count"] == 1
        assert result["total_houses"] == 3
        assert result["yes_percentage"] == 66.7
        assert result["threshold"] == 66
        assert result["vote_status"] == "ACTIVE"


class TestGetMyProposalVote:
    @pytest.mark.asyncio
    async def test_returns_vote_if_exists(self):
        vote_doc = _make_vote(PROPOSAL_ID, HOUSE_ID_1, VOTER_ID, "YES")
        mock_proposal_votes_collection.find_one = AsyncMock(return_value=vote_doc)

        result = await get_my_proposal_vote(PROPOSAL_ID, HOUSE_ID_1)
        assert result["vote"] == "YES"

    @pytest.mark.asyncio
    async def test_returns_none_if_not_voted(self):
        mock_proposal_votes_collection.find_one = AsyncMock(return_value=None)

        result = await get_my_proposal_vote(PROPOSAL_ID, HOUSE_ID_1)
        assert result is None
