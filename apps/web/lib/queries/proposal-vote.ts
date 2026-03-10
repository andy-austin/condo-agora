export const PROPOSAL_VOTE_RESULTS = `
  query ProposalVoteResults($proposalId: String!) {
    proposalVoteResults(proposalId: $proposalId) {
      yesCount
      noCount
      totalHouses
      yesPercentage
      threshold
      isApproved
      voteStatus
    }
  }
`;

export const MY_PROPOSAL_VOTE = `
  query MyProposalVote($proposalId: String!, $houseId: String!) {
    myProposalVote(proposalId: $proposalId, houseId: $houseId) {
      id
      proposalId
      houseId
      voterId
      vote
      createdAt
      updatedAt
    }
  }
`;

export const START_PROPOSAL_VOTE = `
  mutation StartProposalVote($proposalId: String!, $threshold: Int!) {
    startProposalVote(proposalId: $proposalId, threshold: $threshold) {
      id
      status
      voteStatus
      voteThreshold
      voteStartedAt
    }
  }
`;

export const CAST_PROPOSAL_VOTE = `
  mutation CastProposalVote($proposalId: String!, $houseId: String!, $vote: String!) {
    castProposalVote(proposalId: $proposalId, houseId: $houseId, vote: $vote) {
      id
      proposalId
      houseId
      voterId
      vote
      createdAt
      updatedAt
    }
  }
`;

export const CLOSE_PROPOSAL_VOTE = `
  mutation CloseProposalVote($proposalId: String!) {
    closeProposalVote(proposalId: $proposalId) {
      id
      status
      voteStatus
      voteEndedAt
    }
  }
`;

export type ProposalVote = {
  id: string;
  proposalId: string;
  houseId: string;
  voterId: string;
  vote: string;
  createdAt: string;
  updatedAt: string;
};

export type ProposalVoteResults = {
  yesCount: number;
  noCount: number;
  totalHouses: number;
  yesPercentage: number;
  threshold: number;
  isApproved: boolean;
  voteStatus: string;
};

export type ProposalVoteResultsResponse = {
  proposalVoteResults: ProposalVoteResults;
};

export type MyProposalVoteResponse = {
  myProposalVote: ProposalVote | null;
};

export type StartProposalVoteResponse = {
  startProposalVote: {
    id: string;
    status: string;
    voteStatus: string;
    voteThreshold: number;
    voteStartedAt: string;
  };
};

export type CastProposalVoteResponse = {
  castProposalVote: ProposalVote;
};

export type CloseProposalVoteResponse = {
  closeProposalVote: {
    id: string;
    status: string;
    voteStatus: string;
    voteEndedAt: string;
  };
};
