import { gql } from "graphql-request";

export const GET_COMMUNITY_ANALYTICS = gql`
  query GetCommunityAnalytics($organizationId: String!) {
    communityAnalytics(organizationId: $organizationId) {
      organizationId
      totalProposals
      approvedProposals
      activeProjects
      completedProjects
      rejectedProposals
      approvalRate
      lastSessionParticipationRate
      categoryBreakdown {
        category
        count
      }
      monthlyTrends {
        month
        count
      }
      topContributors {
        userId
        proposalsCount
        commentsCount
        totalScore
      }
    }
  }
`;

export const GET_PARTICIPATION_REPORT = gql`
  query GetParticipationReport($sessionId: String!) {
    participationReport(sessionId: $sessionId) {
      sessionId
      sessionTitle
      totalHouses
      votesCast
      participationRate
      votedHouseIds
      nonVotedHouseIds
    }
  }
`;

export interface CategoryStat {
  category: string;
  count: number;
}

export interface MonthlyProposalStat {
  month: string;
  count: number;
}

export interface TopContributor {
  userId: string;
  proposalsCount: number;
  commentsCount: number;
  totalScore: number;
}

export interface CommunityAnalytics {
  organizationId: string;
  totalProposals: number;
  approvedProposals: number;
  activeProjects: number;
  completedProjects: number;
  rejectedProposals: number;
  approvalRate: number;
  lastSessionParticipationRate: number;
  categoryBreakdown: CategoryStat[];
  monthlyTrends: MonthlyProposalStat[];
  topContributors: TopContributor[];
}

export interface ParticipationReport {
  sessionId: string;
  sessionTitle: string;
  totalHouses: number;
  votesCast: number;
  participationRate: number;
  votedHouseIds: string[];
  nonVotedHouseIds: string[];
}
