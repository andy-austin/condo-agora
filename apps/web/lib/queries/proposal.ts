export const GET_PROPOSALS = `
  query GetProposals($organizationId: String!, $status: String, $category: String) {
    proposals(organizationId: $organizationId, status: $status, category: $category) {
      id
      title
      description
      category
      status
      authorId
      organizationId
      responsibleHouseId
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROPOSAL = `
  query GetProposal($id: String!) {
    proposal(id: $id) {
      id
      title
      description
      category
      status
      authorId
      organizationId
      responsibleHouseId
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROPOSAL = `
  mutation CreateProposal(
    $organizationId: String!
    $title: String!
    $description: String!
    $category: String!
    $status: String
  ) {
    createProposal(
      organizationId: $organizationId
      title: $title
      description: $description
      category: $category
      status: $status
    ) {
      id
      title
      description
      category
      status
      authorId
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROPOSAL = `
  mutation UpdateProposal(
    $id: String!
    $title: String!
    $description: String!
    $category: String!
  ) {
    updateProposal(id: $id, title: $title, description: $description, category: $category) {
      id
      title
      description
      category
      status
      updatedAt
    }
  }
`;

export const UPDATE_PROPOSAL_STATUS = `
  mutation UpdateProposalStatus(
    $id: String!
    $status: String!
    $rejectionReason: String
    $responsibleHouseId: String
  ) {
    updateProposalStatus(
      id: $id
      status: $status
      rejectionReason: $rejectionReason
      responsibleHouseId: $responsibleHouseId
    ) {
      id
      status
      rejectionReason
      responsibleHouseId
      updatedAt
    }
  }
`;

export const ASSIGN_RESPONSIBLE_HOUSE = `
  mutation AssignResponsibleHouse($proposalId: String!, $houseId: String!) {
    assignResponsibleHouse(proposalId: $proposalId, houseId: $houseId) {
      id
      responsibleHouseId
      updatedAt
    }
  }
`;

export const DELETE_PROPOSAL = `
  mutation DeleteProposal($id: String!) {
    deleteProposal(id: $id)
  }
`;

export type Proposal = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  authorId: string;
  organizationId: string;
  responsibleHouseId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetProposalsResponse = {
  proposals: Proposal[];
};

export type GetProposalResponse = {
  proposal: Proposal | null;
};

export type CreateProposalResponse = {
  createProposal: Proposal;
};

export type UpdateProposalResponse = {
  updateProposal: Proposal;
};

export type UpdateProposalStatusResponse = {
  updateProposalStatus: Proposal;
};

export type DeleteProposalResponse = {
  deleteProposal: boolean;
};

export type AssignResponsibleHouseResponse = {
  assignResponsibleHouse: Proposal;
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  VOTING: 'Voting',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export const PROPOSAL_CATEGORY_LABELS: Record<string, string> = {
  SECURITY: 'Security',
  INFRASTRUCTURE: 'Infrastructure',
  COMMON_AREAS: 'Common Areas',
  MAINTENANCE: 'Maintenance',
  FINANCIAL: 'Financial',
  OTHER: 'Other',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-blue-100 text-blue-700',
  VOTING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export const CATEGORIES = [
  'SECURITY',
  'INFRASTRUCTURE',
  'COMMON_AREAS',
  'MAINTENANCE',
  'FINANCIAL',
  'OTHER',
] as const;

export const STATUSES = [
  'DRAFT',
  'OPEN',
  'VOTING',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;
