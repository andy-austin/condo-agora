export const GET_ANNOUNCEMENTS = `
  query GetAnnouncements($organizationId: String!) {
    announcements(organizationId: $organizationId) {
      id
      title
      content
      organizationId
      authorId
      isPinned
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ANNOUNCEMENT = `
  mutation CreateAnnouncement(
    $organizationId: String!
    $title: String!
    $content: String!
    $isPinned: Boolean
  ) {
    createAnnouncement(
      organizationId: $organizationId
      title: $title
      content: $content
      isPinned: $isPinned
    ) {
      id
      title
      content
      organizationId
      authorId
      isPinned
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ANNOUNCEMENT = `
  mutation UpdateAnnouncement(
    $id: String!
    $title: String!
    $content: String!
    $isPinned: Boolean
  ) {
    updateAnnouncement(id: $id, title: $title, content: $content, isPinned: $isPinned) {
      id
      title
      content
      isPinned
      updatedAt
    }
  }
`;

export const DELETE_ANNOUNCEMENT = `
  mutation DeleteAnnouncement($id: String!) {
    deleteAnnouncement(id: $id)
  }
`;

export type Announcement = {
  id: string;
  title: string;
  content: string;
  organizationId: string;
  authorId: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GetAnnouncementsResponse = {
  announcements: Announcement[];
};

export type CreateAnnouncementResponse = {
  createAnnouncement: Announcement;
};

export type UpdateAnnouncementResponse = {
  updateAnnouncement: Announcement;
};

export type DeleteAnnouncementResponse = {
  deleteAnnouncement: boolean;
};
