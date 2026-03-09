import { gql } from "graphql-request";

export const MILESTONE_FIELDS = `
  id
  proposalId
  title
  description
  status
  dueDate
  completedAt
  createdBy
  createdAt
  updatedAt
`;

export const GET_PROJECT_MILESTONES = gql`
  query GetProjectMilestones($proposalId: String!) {
    projectMilestones(proposalId: $proposalId) {
      ${MILESTONE_FIELDS}
    }
  }
`;

export const CREATE_PROJECT_MILESTONE = gql`
  mutation CreateProjectMilestone(
    $proposalId: String!
    $title: String!
    $description: String
    $dueDate: String
  ) {
    createProjectMilestone(
      proposalId: $proposalId
      title: $title
      description: $description
      dueDate: $dueDate
    ) {
      ${MILESTONE_FIELDS}
    }
  }
`;

export const UPDATE_MILESTONE_STATUS = gql`
  mutation UpdateMilestoneStatus($id: String!, $status: String!) {
    updateMilestoneStatus(id: $id, status: $status) {
      ${MILESTONE_FIELDS}
    }
  }
`;

export const DELETE_PROJECT_MILESTONE = gql`
  mutation DeleteProjectMilestone($id: String!) {
    deleteProjectMilestone(id: $id)
  }
`;

export interface ProjectMilestone {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export const MILESTONE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};
