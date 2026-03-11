'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  GET_COMMENTS,
  CREATE_COMMENT,
  UPDATE_COMMENT,
  DELETE_COMMENT,
  type Comment,
  type GetCommentsResponse,
  type CreateCommentResponse,
  type UpdateCommentResponse,
  type DeleteCommentResponse,
} from '@/lib/queries/comment';
import { Button } from '@/components/ui/button';
import { MessageSquare, Pencil, Trash2, CornerDownRight } from 'lucide-react';

type CommentSectionProps = {
  proposalId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  getAuthToken: () => Promise<string | null>;
};

export default function CommentSection({
  proposalId,
  currentUserId,
  isAdmin,
  getAuthToken,
}: CommentSectionProps) {
  const t = useTranslations('dashboard.proposals');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<GetCommentsResponse>(GET_COMMENTS, { proposalId });
      setComments(data.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [proposalId, getAuthToken]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<CreateCommentResponse>(CREATE_COMMENT, {
        proposalId,
        content: newContent.trim(),
      });
      setComments((prev) => [...prev, data.createComment]);
      setNewContent('');
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert(t('failedToPost'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<DeleteCommentResponse>(DELETE_COMMENT, { id: commentId });
      await fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    const token = await getAuthToken();
    const client = getApiClient(token);
    const data = await client.request<CreateCommentResponse>(CREATE_COMMENT, {
      proposalId,
      content,
      parentId,
    });
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...c.replies, data.createComment] };
        }
        return c;
      })
    );
  };

  const handleUpdate = async (commentId: string, content: string) => {
    const token = await getAuthToken();
    const client = getApiClient(token);
    const data = await client.request<UpdateCommentResponse>(UPDATE_COMMENT, {
      id: commentId,
      content,
    });
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, content: data.updateComment.content };
        return c;
      })
    );
  };

  if (loading) {
    return (
      <div className="border rounded-xl p-6">
        <div className="skeleton h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-6">
      <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
        <MessageSquare size={18} />
        {t('commentsCount', { count: comments.length })}
      </h2>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t('noComments')}
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onReply={handleReply}
              onUpdate={handleUpdate}
              t={t}
            />
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="border-t pt-4">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={t('writeComment')}
          className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
          maxLength={2000}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !newContent.trim()}
          >
            {submitting ? t('posting') : t('postComment')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onDelete,
  onReply,
  onUpdate,
  t,
  depth = 0,
}: {
  comment: Comment;
  currentUserId: string | null;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  t: (key: string, values?: Record<string, string | number>) => string;
  depth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  const isOwn = currentUserId === comment.authorId;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdmin;

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onUpdate(comment.id, editContent.trim());
      setEditing(false);
    } catch {
      alert(t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    setReplying(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReply(false);
    } catch {
      alert(t('failedToReply'));
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l border-muted' : ''}>
      <div className="group flex gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-semibold text-primary">
            {comment.authorId.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {comment.authorId.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground/60">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-3 mt-1.5">
              {depth < 2 && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight size={12} />
                  {t('reply')}
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Pencil size={12} />
                  {t('edit')}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  {t('deleteComment')}
                </button>
              )}
            </div>
          )}

          {/* Reply input */}
          {showReply && (
            <div className="mt-2 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('writeReply')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReplySubmit} disabled={replying || !replyContent.trim()}>
                  {replying ? t('posting') : t('reply')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReply(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={onDelete}
              onReply={onReply}
              onUpdate={onUpdate}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
