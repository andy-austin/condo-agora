'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { getApiClient } from '@/lib/api';
import {
  GET_PROJECT_MILESTONES,
  CREATE_PROJECT_MILESTONE,
  UPDATE_MILESTONE_STATUS,
  DELETE_PROJECT_MILESTONE,
  type ProjectMilestone,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_COLORS,
} from '@/lib/queries/project_milestone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface ProjectMilestonesProps {
  proposalId: string;
  isAdmin: boolean;
}

export default function ProjectMilestones({
  proposalId,
  isAdmin,
}: ProjectMilestonesProps) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
        if (!token) return;
    const client = getApiClient();
    try {
      const data = await client.request<{
        projectMilestones: ProjectMilestone[];
      }>(GET_PROJECT_MILESTONES, { proposalId });
      setMilestones(data.projectMilestones || []);
    } catch {
      setError('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useState(() => {
    fetchMilestones();
  });

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
        if (!token) return;
    const client = getApiClient();
    try {
      setSubmitting(true);
      const data = await client.request<{
        createProjectMilestone: ProjectMilestone;
      }>(CREATE_PROJECT_MILESTONE, {
        proposalId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueDate: newDueDate || undefined,
      });
      setMilestones((prev) => [...prev, data.createProjectMilestone]);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setShowForm(false);
    } catch {
      setError('Failed to create milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
        if (!token) return;
    const client = getApiClient();
    try {
      const data = await client.request<{
        updateMilestoneStatus: ProjectMilestone;
      }>(UPDATE_MILESTONE_STATUS, { id, status });
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? data.updateMilestoneStatus : m))
      );
    } catch {
      setError('Failed to update milestone');
    }
  };

  const handleDelete = async (id: string) => {
        if (!token) return;
    const client = getApiClient();
    try {
      await client.request(DELETE_PROJECT_MILESTONE, { id });
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Failed to delete milestone');
    }
  };

  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Project Milestones</h3>
          {total > 0 && (
            <Badge variant="secondary">
              {completed}/{total}
            </Badge>
          )}
        </div>
        {isAdmin && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Add Milestone
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{progressPct.toFixed(0)}% complete</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {showForm && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="border rounded-lg p-3 space-y-2 bg-gray-50"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Milestone title *"
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            required
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !newTitle.trim()}>
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Add
            </Button>
          </div>
        </form>
      )}

      {milestones.length === 0 && !showForm ? (
        <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No milestones yet
          {isAdmin && (
            <span>
              {' '}
              — click &ldquo;Add Milestone&rdquo; to track project progress
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone, idx) => (
            <div key={milestone.id} className="flex items-start gap-3 group">
              {/* Timeline dot */}
              <div className="flex flex-col items-center flex-shrink-0 mt-1">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    milestone.status === 'COMPLETED'
                      ? 'bg-green-500 border-green-500'
                      : milestone.status === 'IN_PROGRESS'
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                />
                {idx < milestones.length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                )}
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      milestone.status === 'COMPLETED'
                        ? 'line-through text-muted-foreground'
                        : ''
                    }`}
                  >
                    {milestone.title}
                  </span>
                  <Badge className={`text-[10px] ${MILESTONE_STATUS_COLORS[milestone.status]}`}>
                    {MILESTONE_STATUS_LABELS[milestone.status]}
                  </Badge>
                </div>
                {milestone.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {milestone.description}
                  </p>
                )}
                {milestone.dueDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due:{' '}
                    {new Date(milestone.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {milestone.status !== 'COMPLETED' && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(
                          milestone.id,
                          milestone.status === 'PENDING'
                            ? 'IN_PROGRESS'
                            : 'COMPLETED'
                        )
                      }
                      className="p-1 rounded hover:bg-gray-100 text-muted-foreground"
                      title={
                        milestone.status === 'PENDING'
                          ? 'Start'
                          : 'Mark complete'
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
