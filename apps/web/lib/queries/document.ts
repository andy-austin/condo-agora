import { gql } from "graphql-request";

export const DOCUMENT_FIELDS = `
  id
  proposalId
  type
  fileUrl
  fileName
  fileSize
  mimeType
  uploadedBy
  selected
  createdAt
  updatedAt
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments($proposalId: String!, $type: String) {
    documents(proposalId: $proposalId, type: $type) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export const ATTACH_DOCUMENT = gql`
  mutation AttachDocument(
    $proposalId: String!
    $type: String!
    $fileUrl: String!
    $fileName: String!
    $fileSize: Int!
    $mimeType: String!
  ) {
    attachDocument(
      proposalId: $proposalId
      type: $type
      fileUrl: $fileUrl
      fileName: $fileName
      fileSize: $fileSize
      mimeType: $mimeType
    ) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: String!) {
    deleteDocument(id: $id)
  }
`;

export const MARK_QUOTE_SELECTED = gql`
  mutation MarkQuoteSelected($id: String!) {
    markQuoteSelected(id: $id) {
      ${DOCUMENT_FIELDS}
    }
  }
`;

export interface Document {
  id: string;
  proposalId: string;
  type: "QUOTE" | "DESIGN" | "WARRANTY" | "RECEIPT" | "OTHER";
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  DESIGN: "Design",
  WARRANTY: "Warranty",
  RECEIPT: "Receipt",
  OTHER: "Other",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS);

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
