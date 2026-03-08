export const CREATE_ORGANIZATION = `
  mutation CreateOrganization($name: String!) {
    createOrganization(name: $name) {
      id
      name
      slug
    }
  }
`;

export type CreateOrganizationResponse = {
  createOrganization: {
    id: string;
    name: string;
    slug: string;
  };
};
