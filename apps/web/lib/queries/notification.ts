export const GET_NOTIFICATIONS = `
  query GetNotifications($limit: Int) {
    notifications(limit: $limit) {
      id
      userId
      type
      title
      message
      referenceId
      isRead
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const GET_UNREAD_COUNT = `
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const GET_ACTIVITY_FEED = `
  query ActivityFeed($organizationId: String!, $limit: Int) {
    activityFeed(organizationId: $organizationId, limit: $limit) {
      id
      type
      title
      description
      referenceId
      organizationId
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = `
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId: string;
  isRead: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  referenceId: string;
  organizationId: string;
  createdAt: string;
};

export type GetNotificationsResponse = {
  notifications: Notification[];
};

export type UnreadCountResponse = {
  unreadNotificationCount: number;
};

export type ActivityFeedResponse = {
  activityFeed: ActivityItem[];
};

export type MarkReadResponse = {
  markNotificationRead: Notification;
};

export type MarkAllReadResponse = {
  markAllNotificationsRead: number;
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  NEW_PROPOSAL: 'New Proposal',
  STATUS_CHANGE: 'Status Change',
  NEW_COMMENT: 'New Comment',
  NEW_ANNOUNCEMENT: 'New Announcement',
  INVITATION: 'Invitation',
};

export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  PROPOSAL: '💡',
  ANNOUNCEMENT: '📢',
  COMMENT: '💬',
  STATUS_CHANGE: '🔄',
};
