import { gql } from "graphql-request";

export const VOTING_SESSION_FIELDS = `
  id
  organizationId
  title
  status
  proposalIds
  startDate
  endDate
  createdBy
  createdAt
  updatedAt
`;

export const VOTE_FIELDS = `
  id
  votingSessionId
  houseId
  voterId
  rankings {
    proposalId
    rank
  }
  submittedAt
`;

export const GET_VOTING_SESSIONS = gql`
  query GetVotingSessions($organizationId: String!) {
    votingSessions(organizationId: $organizationId) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const GET_VOTING_SESSION = gql`
  query GetVotingSession($id: String!) {
    votingSession(id: $id) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const GET_VOTING_RESULTS = gql`
  query GetVotingResults($sessionId: String!) {
    votingResults(sessionId: $sessionId) {
      sessionId
      sessionTitle
      status
      totalHouses
      votesCast
      participationRate
      proposalScores {
        proposalId
        title
        score
        votesCount
        rank
        approvalPercentage
        isApproved
      }
    }
  }
`;

export const GET_MY_VOTE = gql`
  query GetMyVote($sessionId: String!, $houseId: String!) {
    myVote(sessionId: $sessionId, houseId: $houseId) {
      ${VOTE_FIELDS}
    }
  }
`;

export const CREATE_VOTING_SESSION = gql`
  mutation CreateVotingSession(
    $organizationId: String!
    $title: String!
    $proposalIds: [String!]!
    $startDate: String
    $endDate: String
  ) {
    createVotingSession(
      organizationId: $organizationId
      title: $title
      proposalIds: $proposalIds
      startDate: $startDate
      endDate: $endDate
    ) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const UPDATE_VOTING_SESSION_PROPOSALS = gql`
  mutation UpdateVotingSessionProposals(
    $sessionId: String!
    $proposalIds: [String!]!
  ) {
    updateVotingSessionProposals(
      sessionId: $sessionId
      proposalIds: $proposalIds
    ) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const OPEN_VOTING_SESSION = gql`
  mutation OpenVotingSession($sessionId: String!) {
    openVotingSession(sessionId: $sessionId) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const CLOSE_VOTING_SESSION = gql`
  mutation CloseVotingSession($sessionId: String!) {
    closeVotingSession(sessionId: $sessionId) {
      ${VOTING_SESSION_FIELDS}
    }
  }
`;

export const CAST_VOTE = gql`
  mutation CastVote(
    $sessionId: String!
    $houseId: String!
    $rankings: [RankingInput!]!
  ) {
    castVote(
      sessionId: $sessionId
      houseId: $houseId
      rankings: $rankings
    ) {
      ${VOTE_FIELDS}
    }
  }
`;

export interface RankingEntry {
  proposalId: string;
  rank: number;
}

export interface VotingSession {
  id: string;
  organizationId: string;
  title: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  proposalIds: string[];
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  votingSessionId: string;
  houseId: string;
  voterId: string;
  rankings: RankingEntry[];
  submittedAt: string;
}

export interface ProposalScore {
  proposalId: string;
  title: string;
  score: number;
  votesCount: number;
  rank: number;
  approvalPercentage: number;
  isApproved: boolean;
}

export interface VotingResults {
  sessionId: string;
  sessionTitle: string;
  status: string;
  totalHouses: number;
  votesCast: number;
  participationRate: number;
  proposalScores: ProposalScore[];
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

export const SESSION_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-700",
};
