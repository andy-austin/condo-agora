'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_COUNT,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  type Notification,
  type GetNotificationsResponse,
  type UnreadCountResponse,
} from '@/lib/queries/notification';
import { ACCEPT_INVITATION } from '@/lib/queries/invitation';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const REFERENCE_ROUTES: Record<string, string> = {
  NEW_PROPOSAL: '/dashboard/proposals',
  STATUS_CHANGE: '/dashboard/proposals',
  NEW_COMMENT: '/dashboard/proposals',
  NEW_ANNOUNCEMENT: '/dashboard',
  INVITATION: '/dashboard/settings',
};

export default function NotificationBell() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { getAuthToken } = useAuthToken();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UnreadCountResponse>(GET_UNREAD_COUNT);
      setUnreadCount(data.unreadNotificationCount);
    } catch {
      // silently fail for count
    }
  }, [getAuthToken]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<GetNotificationsResponse>(GET_NOTIFICATIONS, {
        limit: 10,
      });
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
    } catch {
      // silently fail
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request(MARK_NOTIFICATION_READ, { id: notification.id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - (notification.isRead ? 0 : 1)));

      // Auto-accept invitation when clicking notification
      if (notification.type === 'INVITATION' && notification.referenceId) {
        try {
          await client.request(ACCEPT_INVITATION, {
            invitationId: notification.referenceId,
          });
        } catch {
          // Invitation may already be accepted or expired — navigate anyway
        }
      }
    } catch {
      // silently fail
    }

    const route = REFERENCE_ROUTES[notification.type] || '/dashboard';
    const href =
      notification.type === 'NEW_COMMENT' || notification.type === 'STATUS_CHANGE'
        ? `/dashboard/proposals/${notification.referenceId}`
        : route;

    setOpen(false);
    router.push(href);
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request(MARK_ALL_NOTIFICATIONS_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={t('notifications.title')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('notifications.noNotificationsYet')}
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                    <div className={!notification.isRead ? '' : 'pl-4'}>
                      <p className="text-xs font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              {t('notifications.viewAll')} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
