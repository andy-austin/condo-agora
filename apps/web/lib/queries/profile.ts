export const ME_PROFILE_QUERY = `
  query MeProfile {
    me {
      id
      email
      phone
      authProvider
      firstName
      lastName
      avatarUrl
      createdAt
      memberships {
        organization {
          id
          name
        }
        role
      }
    }
  }
`;

export const UPDATE_PROFILE = `
  mutation CompleteProfile($input: CompleteProfileInput!) {
    completeProfile(input: $input) {
      id
      firstName
      lastName
      email
      avatarUrl
    }
  }
`;
