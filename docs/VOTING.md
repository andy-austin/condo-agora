# Voting System

## Overview

The voting system allows organizations to create voting sessions where designated house voters rank proposals using a Borda Count algorithm. Proposals that achieve ≥66% approval are automatically marked as APPROVED.

## Session Lifecycle

```
DRAFT → OPEN → CLOSED
```

| State  | Description                                      | Who can act         |
|--------|--------------------------------------------------|---------------------|
| DRAFT  | Session created, proposals can be added/removed  | ADMIN               |
| OPEN   | Voting is active, designated voters can cast votes | ADMIN (manage), designated voters (vote) |
| CLOSED | Voting ended, results finalized, approved proposals updated | Everyone (view results) |

## Data Models

### voting_sessions

| Field             | Type              | Description                          |
|-------------------|-------------------|--------------------------------------|
| `_id`             | ObjectId          | MongoDB ID                           |
| `organization_id` | str              | Reference to organization            |
| `title`           | str              | Session name                         |
| `status`          | str              | `DRAFT` \| `OPEN` \| `CLOSED`       |
| `proposal_ids`    | List[str]        | Proposals being voted on             |
| `start_date`      | Optional[datetime]| Scheduled start                     |
| `end_date`        | Optional[datetime]| Scheduled end                       |
| `created_by`      | str              | User ID of the creator               |
| `created_at`      | datetime          | Creation timestamp                   |
| `updated_at`      | datetime          | Last update timestamp                |

### votes

| Field                | Type                              | Description                        |
|----------------------|-----------------------------------|------------------------------------|
| `_id`                | ObjectId                          | MongoDB ID                         |
| `voting_session_id`  | str                               | Reference to voting session        |
| `house_id`           | str                               | Which house cast the vote          |
| `voter_id`           | str                               | User ID of the designated voter    |
| `rankings`           | List[{proposal_id, rank}]        | Ranked proposals (1 = highest)     |
| `submitted_at`       | datetime                          | When the vote was cast             |
| `created_at`         | datetime                          | Creation timestamp                 |
| `updated_at`         | datetime                          | Last update timestamp              |

**Unique index**: `(voting_session_id, house_id)` — one vote per house per session.

## Designated Voter

Each house has a single **designated voter** (`voter_user_id` on the house document) who is authorized to cast that house's vote.

### Rules

- If a house has exactly 1 resident, that resident is auto-assigned as voter.
- If a house has 0 or 2+ residents, an admin must designate who votes via the `setHouseVoter` mutation.
- Only the designated voter can submit votes for that house.
- If no designated voter is set, the house cannot vote.
- Removing a resident who is the designated voter clears `voter_user_id` to null.

## Proposals & Voting

### Proposal Statuses

```
DRAFT → OPEN → VOTING → APPROVED / REJECTED
                  ↓
            IN_PROGRESS → COMPLETED
```

Only proposals with status **VOTING** are eligible to be added to a voting session. When a session closes, proposals that meet the approval threshold are automatically updated to **APPROVED**.

## Voting Algorithm: Borda Count

### Scoring

Each voter ranks all proposals. Points are assigned based on rank:

```
Score = N - rank + 1

Where N = total number of proposals
```

**Example with 3 proposals:**

| Rank | Points |
|------|--------|
| 1st  | 3      |
| 2nd  | 2      |
| 3rd  | 1      |

### Approval Threshold

A proposal is **APPROVED** if ≥66% of all houses in the organization rank it in the **top half** of their ballot.

```
Approval % = (houses ranking in top half / total houses) × 100
```

**Example:**
- 10 houses total, 4 proposals
- Top half = positions 1 and 2
- Proposal A is ranked in top 2 by 7 houses
- Approval = 7/10 = 70% → **APPROVED**

## Permissions

| Role     | Action                          | Requirements                              |
|----------|---------------------------------|-------------------------------------------|
| ADMIN    | Create voting session           | Organization admin                        |
| ADMIN    | Update proposals (DRAFT)        | Session in DRAFT state                    |
| ADMIN    | Open session (DRAFT → OPEN)     | Session in DRAFT + has at least 1 proposal |
| ADMIN    | Close session (OPEN → CLOSED)   | Session in OPEN state                     |
| ADMIN    | View results                    | Anytime                                   |
| MEMBER   | List voting sessions            | Organization member                       |
| MEMBER   | Cast vote                       | Designated voter + session OPEN           |
| MEMBER   | Change vote                     | Designated voter + session still OPEN     |
| MEMBER   | View results                    | Session is CLOSED                         |

## GraphQL API

### Queries

```graphql
votingSessions(organizationId: String!): [VotingSession]
votingSession(id: String!): VotingSession
votingResults(sessionId: String!): VotingResults
myVote(sessionId: String!, houseId: String!): Vote
```

### Mutations

```graphql
createVotingSession(
  organizationId: String!
  title: String!
  proposalIds: [String!]!
  startDate: String
  endDate: String
): VotingSession

updateVotingSessionProposals(
  sessionId: String!
  proposalIds: [String!]!
): VotingSession

openVotingSession(sessionId: String!): VotingSession
closeVotingSession(sessionId: String!): VotingSession

castVote(
  sessionId: String!
  houseId: String!
  rankings: [RankingInput!]!
): Vote
```

## Frontend Pages

| Page                              | Path                                | Description                        |
|-----------------------------------|-------------------------------------|------------------------------------|
| Voting list                       | `/dashboard/vote`                   | Lists all sessions by status       |
| Create session                    | `/dashboard/vote/new`               | Admin form to create a session     |
| Session detail / vote             | `/dashboard/vote/[sessionId]`       | Cast vote or manage session        |
| Results                           | `/dashboard/vote/[sessionId]/results` | Live/final results with charts   |

## File Structure

### Backend

```
apps/api/
├── models/voting_session.py       # Pydantic models (VotingSession, Vote)
├── graphql_types/voting.py        # Strawberry GraphQL types
├── schemas/voting.py              # Query/Mutation class definitions
├── resolvers/voting.py            # All voting resolvers
├── src/voting/service.py          # Core business logic
└── tests/voting/test_service.py   # Test suite
```

### Frontend

```
apps/web/app/dashboard/vote/
├── page.tsx                       # Session list
├── new/page.tsx                   # Create session form
└── [sessionId]/
    ├── page.tsx                   # Vote / manage session
    └── results/page.tsx           # View results (polls every 30s if OPEN)
```

## Manual Testing Checklist

### Prerequisites

1. At least **2 proposals** in `VOTING` status
2. At least **1 house** with a **designated voter** assigned
3. An **ADMIN** user (to create/open/close sessions)
4. A **resident** user who is the designated voter (to cast votes)

### Steps

1. **Create proposals** — go to proposals section, create 2-3 proposals, change their status to VOTING
2. **Assign designated voter** — ensure a house has `voter_user_id` set (auto-assigned if 1 resident, otherwise use `setHouseVoter`)
3. **Create session** — `/dashboard/vote` → "New Session" → select title and proposals
4. **Open session** — on the session page, click "Open for Voting"
5. **Cast vote** — log in as the designated voter, go to the session, rank proposals, submit
6. **View live results** — `/dashboard/vote/[sessionId]/results` (updates every 30s)
7. **Close session** — log in as admin, click "Close and Calculate"
8. **Verify results** — check that proposals with ≥66% approval changed to APPROVED status

## Database Indexes

```python
# voting_sessions
- organization_id (single)
- (organization_id, status) (compound)
- created_at (descending)

# votes
- (voting_session_id, house_id) UNIQUE
- voting_session_id (single)
```
