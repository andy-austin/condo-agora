'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiClient } from '@/lib/api';
import {
  GET_ACTIVITY_FEED,
  type ActivityItem,
  type ActivityFeedResponse,
  ACTIVITY_TYPE_ICONS,
} from '@/lib/queries/notification';
import { Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  organizationId: string;
};

const TYPE_ROUTES: Record<string, (id: string) => string> = {
  PROPOSAL: (id) => `/dashboard/proposals/${id}`,
  ANNOUNCEMENT: () => `/dashboard`,
  COMMENT: (id) => `/dashboard/proposals/${id}`,
  STATUS_CHANGE: (id) => `/dashboard/proposals/${id}`,
};

export default function ActivityFeed({ organizationId }: Props) {
  const t = useTranslations('dashboard');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const client = getApiClient();
      const data = await client.request<ActivityFeedResponse>(GET_ACTIVITY_FEED, {
        organizationId,
        limit: 10,
      });
      setItems(data.activityFeed);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="border rounded-xl p-6">
        <div className="skeleton h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Activity size={18} className="text-primary" />
        {t('activityFeed.title')}
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const routeFn = TYPE_ROUTES[item.type];
          const href = routeFn ? routeFn(item.referenceId) : '/dashboard';
          const emoji = ACTIVITY_TYPE_ICONS[item.type] || '📌';

          return (
            <Link
              key={item.id}
              href={href}
              className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors"
            >
              <span className="text-lg shrink-0">{emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
