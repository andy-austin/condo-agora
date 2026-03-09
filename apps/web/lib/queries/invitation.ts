export const GET_PENDING_INVITATIONS = `
  query PendingInvitations($organizationId: String!) {
    pendingInvitations(organizationId: $organizationId) {
      id
      email
      role
      method
      expiresAt
      createdAt
    }
  }
`;

export const ACCEPT_INVITATION = `
  mutation AcceptInvitation($invitationId: String!) {
    acceptInvitation(invitationId: $invitationId) {
      id
      email
      organizationId
      acceptedAt
    }
  }
`;

export const REVOKE_INVITATION = `
  mutation RevokeInvitation($invitationId: String!) {
    revokeInvitation(invitationId: $invitationId)
  }
`;

export const RESEND_INVITATION = `
  mutation ResendInvitation($invitationId: String!) {
    resendInvitation(invitationId: $invitationId) {
      id
      email
      createdAt
    }
  }
`;

export type Invitation = {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  method: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};

export type PendingInvitationsResponse = {
  pendingInvitations: Invitation[];
};

export type AcceptInvitationResponse = {
  acceptInvitation: Invitation;
};

export type RevokeInvitationResponse = {
  revokeInvitation: boolean;
};

export type ResendInvitationResponse = {
  resendInvitation: Invitation;
};
