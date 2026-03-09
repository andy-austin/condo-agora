'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { getApiClient } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  GET_ANNOUNCEMENTS,
  CREATE_ANNOUNCEMENT,
  DELETE_ANNOUNCEMENT,
  type Announcement,
  type GetAnnouncementsResponse,
  type CreateAnnouncementResponse,
  type DeleteAnnouncementResponse,
} from '@/lib/queries/announcement';
import { Button } from '@/components/ui/button';
import { Megaphone, Pin, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  organizationId: string;
  isAdmin: boolean;
};

export default function AnnouncementsSection({ organizationId, isAdmin }: Props) {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<GetAnnouncementsResponse>(GET_ANNOUNCEMENTS, {
        organizationId,
      });
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, getAuthToken]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<CreateAnnouncementResponse>(CREATE_ANNOUNCEMENT, {
        organizationId,
        title: formTitle.trim(),
        content: formContent.trim(),
        isPinned: formPinned,
      });
      setAnnouncements((prev) => {
        const updated = [data.createAnnouncement, ...prev];
        return updated.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      });
      setFormTitle('');
      setFormContent('');
      setFormPinned(false);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create announcement:', err);
      alert(t('announcements.failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('announcements.deleteConfirm'))) return;
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<DeleteAnnouncementResponse>(DELETE_ANNOUNCEMENT, { id });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  if (loading) {
    return <div className="skeleton h-32 rounded-xl" />;
  }

  if (!isAdmin && announcements.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone size={18} className="text-primary" />
          {t('announcements.title')}
        </h2>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? t('common.cancel') : t('common.new')}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border rounded-lg p-4 mb-4 bg-muted/20 space-y-3">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder={t('announcements.titlePlaceholder')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
          <textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder={t('announcements.contentPlaceholder')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
            required
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded"
              />
              <Pin size={14} />
              {t('announcements.pinAnnouncement')}
            </label>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t('common.posting') : t('common.post')}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('announcements.noAnnouncements')}
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-lg p-4 ${
                announcement.isPinned
                  ? 'bg-primary/5 border border-primary/20'
                  : 'border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {announcement.isPinned && (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Pin size={11} />
                        {t('announcements.pinned')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {t('announcements.official')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold">{announcement.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
