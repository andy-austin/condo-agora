import { gql } from "graphql-request";

export const BUDGET_FIELDS = `
  id
  proposalId
  approvedAmount
  spentAmount
  currency
  createdBy
  createdAt
  updatedAt
  variance
  costPerUnit
`;

export const GET_PROPOSAL_BUDGET = gql`
  query GetProposalBudget($proposalId: String!) {
    proposalBudget(proposalId: $proposalId) {
      ${BUDGET_FIELDS}
    }
  }
`;

export const GET_FINANCIAL_SUMMARY = gql`
  query GetFinancialSummary($organizationId: String!) {
    financialSummary(organizationId: $organizationId) {
      totalApproved
      totalSpent
      totalRemaining
      projectCount
      currency
    }
  }
`;

export const SET_BUDGET = gql`
  mutation SetBudget(
    $proposalId: String!
    $approvedAmount: Float!
    $currency: String
  ) {
    setBudget(
      proposalId: $proposalId
      approvedAmount: $approvedAmount
      currency: $currency
    ) {
      ${BUDGET_FIELDS}
    }
  }
`;

export const UPDATE_SPENT_AMOUNT = gql`
  mutation UpdateSpentAmount($proposalId: String!, $spentAmount: Float!) {
    updateSpentAmount(proposalId: $proposalId, spentAmount: $spentAmount) {
      ${BUDGET_FIELDS}
    }
  }
`;

export interface Budget {
  id: string;
  proposalId: string;
  approvedAmount: number;
  spentAmount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  variance: number;
  costPerUnit: number;
}

export interface FinancialSummary {
  totalApproved: number;
  totalSpent: number;
  totalRemaining: number;
  projectCount: number;
  currency: string;
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
