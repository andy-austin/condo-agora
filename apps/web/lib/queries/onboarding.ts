export const BULK_SETUP_ORGANIZATION = `
  mutation BulkSetupOrganization($input: BulkSetupInput!) {
    bulkSetupOrganization(input: $input) {
      organization {
        id
        name
        slug
      }
      totalProperties
      totalResidents
      rows {
        rowId
        status
        error
        propertyId
        userId
      }
    }
  }
`;

export const COMPLETE_PROFILE = `
  mutation CompleteProfile($input: CompleteProfileInput!) {
    completeProfile(input: $input) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

export type BulkSetupRow = {
  rowId: string;
  propertyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type BulkSetupInput = {
  organizationName: string;
  rows: BulkSetupRow[];
};

export type RowStatus = "SUCCESS" | "ERROR" | "SKIPPED";

export type BulkSetupRowResult = {
  rowId: string;
  status: RowStatus;
  error?: string;
  propertyId?: string;
  userId?: string;
};

export type BulkSetupResult = {
  bulkSetupOrganization: {
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    totalProperties: number;
    totalResidents: number;
    rows: BulkSetupRowResult[];
  };
};
