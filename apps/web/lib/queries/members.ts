export const GET_ORGANIZATION_MEMBERS = `
  query GetOrganizationMembers($organizationId: String!) {
    organizationMembers(organizationId: $organizationId) {
      id
      userId
      organizationId
      houseId
      role
      email
      firstName
      lastName
      avatarUrl
      houseName
      createdAt
    }
  }
`;

export const UPDATE_MEMBER_ROLE = `
  mutation UpdateMemberRole($memberId: String!, $role: Role!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      userId
      role
      email
      firstName
      lastName
    }
  }
`;

export type Member = {
  id: string;
  userId: string;
  organizationId: string;
  houseId: string | null;
  role: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  houseName: string | null;
  createdAt: string;
};

export type GetMembersResponse = {
  organizationMembers: Member[];
};

export type UpdateMemberRoleResponse = {
  updateMemberRole: Member;
};
