'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  type Notification,
  type GetNotificationsResponse,
} from '@/lib/queries/notification';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { Bell, Check } from 'lucide-react';

const REFERENCE_ROUTES: Record<string, (id: string) => string> = {
  NEW_PROPOSAL: (id) => `/dashboard/proposals/${id}`,
  STATUS_CHANGE: (id) => `/dashboard/proposals/${id}`,
  NEW_COMMENT: (id) => `/dashboard/proposals/${id}`,
  NEW_ANNOUNCEMENT: () => `/dashboard`,
  INVITATION: () => `/dashboard/settings`,
};

export default function NotificationsPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const client = getApiClient();
      const data = await client.request<GetNotificationsResponse>(GET_NOTIFICATIONS, {
        limit: 100,
      });
      setNotifications(data.notifications);
    } catch (err) {
      console.error(t('notifications.failedToLoad'), err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        const client = getApiClient();
        await client.request(MARK_NOTIFICATION_READ, { id: notification.id });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // silently fail
      }
    }

    const routeFn = REFERENCE_ROUTES[notification.type];
    if (routeFn) {
      router.push(routeFn(notification.referenceId));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const client = getApiClient();
      await client.request(MARK_ALL_NOTIFICATIONS_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Breadcrumb items={[{ label: t('notifications.title') }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={22} />
            {t('notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} {unreadCount !== 1 ? t('notifications.unreadNotifications') : t('notifications.unreadNotification')}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check size={14} className="mr-1.5" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bell size={28} className="text-primary" />
          </div>
          <h3 className="font-semibold mb-1">{t('notifications.noNotifications')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('notifications.noNotificationsHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleClick(notification)}
              className={`w-full text-left border rounded-xl px-5 py-4 hover:border-primary/30 transition-all ${
                !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
                <div className={!notification.isRead ? '' : 'pl-5'}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      {t(`labels.notificationType.${notification.type}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
