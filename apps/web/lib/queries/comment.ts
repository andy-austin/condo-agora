export const GET_COMMENTS = `
  query GetComments($proposalId: String!) {
    comments(proposalId: $proposalId) {
      id
      proposalId
      authorId
      content
      parentId
      createdAt
      updatedAt
      replies {
        id
        proposalId
        authorId
        content
        parentId
        createdAt
        updatedAt
        replies {
          id
          proposalId
          authorId
          content
          parentId
          createdAt
          updatedAt
          replies {
            id
          }
        }
      }
    }
  }
`;

export const CREATE_COMMENT = `
  mutation CreateComment($proposalId: String!, $content: String!, $parentId: String) {
    createComment(proposalId: $proposalId, content: $content, parentId: $parentId) {
      id
      proposalId
      authorId
      content
      parentId
      createdAt
      updatedAt
      replies {
        id
      }
    }
  }
`;

export const UPDATE_COMMENT = `
  mutation UpdateComment($id: String!, $content: String!) {
    updateComment(id: $id, content: $content) {
      id
      content
      updatedAt
    }
  }
`;

export const DELETE_COMMENT = `
  mutation DeleteComment($id: String!) {
    deleteComment(id: $id)
  }
`;

export type CommentReply = {
  id: string;
  proposalId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies: CommentReply[];
};

export type Comment = CommentReply;

export type GetCommentsResponse = {
  comments: Comment[];
};

export type CreateCommentResponse = {
  createComment: Comment;
};

export type UpdateCommentResponse = {
  updateComment: Comment;
};

export type DeleteCommentResponse = {
  deleteComment: boolean;
};
