'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_PROPOSAL,
  UPDATE_PROPOSAL,
  UPDATE_PROPOSAL_STATUS,
  DELETE_PROPOSAL,
  type Proposal,
  type GetProposalResponse,
  type UpdateProposalResponse,
  type UpdateProposalStatusResponse,
  type DeleteProposalResponse,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_CATEGORY_LABELS,
  STATUS_COLORS,
  CATEGORIES,
} from '@/lib/queries/proposal';
import { GET_HOUSES, type House, type GetHousesResponse } from '@/lib/queries/house';
import CommentSection from '@/components/proposals/CommentSection';
import DocumentSection from '@/components/proposals/DocumentSection';
import ProjectMilestones from '@/components/proposals/ProjectMilestones';
import BudgetSection from '@/components/proposals/BudgetSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import {
  Calendar,
  Pencil,
  Trash2,
  ChevronRight,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

const ME_QUERY = `
  query Me {
    me {
      id
      memberships {
        organization { id }
        role
      }
    }
  }
`;

type MeResponse = {
  me: {
    id: string;
    memberships: { organization: { id: string }; role: string }[];
  } | null;
};

const STATUS_FLOW = [
  'DRAFT',
  'OPEN',
  'VOTING',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;
  const { getAuthToken } = useAuthToken();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('OTHER');
  const [saving, setSaving] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [moderating, setModerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);

      const [proposalData, meData] = await Promise.all([
        client.request<GetProposalResponse>(GET_PROPOSAL, { id: proposalId }),
        client.request<MeResponse>(ME_QUERY),
      ]);

      if (!proposalData.proposal) {
        setError('Proposal not found.');
        return;
      }

      const p = proposalData.proposal;
      setProposal(p);
      setEditTitle(p.title);
      setEditDescription(p.description);
      setEditCategory(p.category);

      if (meData.me) {
        setCurrentUserId(meData.me.id);
        const membership = meData.me.memberships.find(
          (m) => m.organization.id === p.organizationId
        );
        const adminUser = membership?.role === 'ADMIN';
        setIsAdmin(adminUser);

        if (adminUser) {
          const housesData = await client.request<GetHousesResponse>(GET_HOUSES, {
            organizationId: p.organizationId,
          });
          setHouses(housesData.houses);
        }
      }
    } catch (err) {
      console.error('Failed to load proposal:', err);
      setError('Failed to load proposal details.');
    } finally {
      setLoading(false);
    }
  }, [proposalId, getAuthToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEdit = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UpdateProposalResponse>(UPDATE_PROPOSAL, {
        id: proposal.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
      });
      setProposal({ ...proposal, ...data.updateProposal });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update proposal:', err);
      alert('Failed to update proposal.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    newStatus: string,
    opts: { rejectionReason?: string; responsibleHouseId?: string } = {}
  ) => {
    if (!proposal) return;
    setModerating(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UpdateProposalStatusResponse>(
        UPDATE_PROPOSAL_STATUS,
        {
          id: proposal.id,
          status: newStatus,
          rejectionReason: opts.rejectionReason || null,
          responsibleHouseId: opts.responsibleHouseId || null,
        }
      );
      setProposal({ ...proposal, ...data.updateProposalStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
      const message = err instanceof Error ? err.message : 'Failed to update status.';
      alert(message);
    } finally {
      setModerating(false);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const handleDelete = async () => {
    if (!proposal || !confirm('Are you sure you want to delete this proposal?')) return;
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<DeleteProposalResponse>(DELETE_PROPOSAL, { id: proposal.id });
      router.push('/dashboard/proposals');
    } catch (err) {
      console.error('Failed to delete proposal:', err);
      alert('Failed to delete proposal.');
    }
  };

  if (loading) {
    return <ProposalDetailSkeleton />;
  }

  if (error || !proposal) {
    return (
      <ErrorState
        title="Proposal not found"
        message={error || 'The proposal you are looking for does not exist.'}
        onRetry={() => router.push('/dashboard/proposals')}
      />
    );
  }

  const isAuthor = currentUserId === proposal.authorId;
  const canEdit = isAuthor && proposal.status === 'DRAFT';
  const canDelete = isAuthor && proposal.status === 'DRAFT';
  const canSubmit = isAuthor && proposal.status === 'DRAFT';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Proposals', href: '/dashboard/proposals' },
          { label: proposal.title },
        ]}
      />

      {/* Header */}
      <div className="border rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full text-xl font-bold bg-background border rounded-lg px-3 py-2"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        editCategory === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border'
                      }`}
                    >
                      {PROPOSAL_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {PROPOSAL_CATEGORY_LABELS[proposal.category] || proposal.category}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold">{proposal.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </span>
                  {proposal.responsibleHouseId && (
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      Assigned unit
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Author actions */}
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditTitle(proposal.title);
                    setEditDescription(proposal.description);
                    setEditCategory(proposal.category);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit proposal"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    title="Delete proposal"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="border rounded-xl p-6">
            <h2 className="text-base font-semibold mb-3">Description</h2>
            {editing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={10}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.description}
              </p>
            )}
          </div>

          {/* Rejection reason */}
          {proposal.status === 'REJECTED' && proposal.rejectionReason && (
            <div className="border border-destructive/30 rounded-xl p-6 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2 text-destructive">
                <AlertTriangle size={16} />
                <h2 className="text-base font-semibold">Rejection Reason</h2>
              </div>
              <p className="text-sm">{proposal.rejectionReason}</p>
            </div>
          )}

          {/* Documents */}
          <div className="border rounded-xl p-5">
            <DocumentSection
              proposalId={proposal.id}
              isAdmin={isAdmin}
              currentUserId={currentUserId ?? ''}
            />
          </div>

          {/* Project Milestones - only for IN_PROGRESS proposals */}
          {proposal.status === 'IN_PROGRESS' && (
            <div className="border rounded-xl p-5">
              <ProjectMilestones
                proposalId={proposal.id}
                isAdmin={isAdmin}
              />
            </div>
          )}

          {/* Comments */}
          <CommentSection
            proposalId={proposal.id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            getAuthToken={getAuthToken}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Timeline */}
          <div className="border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Status Timeline</h3>
            <StatusTimeline currentStatus={proposal.status} />
          </div>

          {/* Budget - for approved, in-progress, and completed proposals */}
          {['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(proposal.status) && (
            <div className="border rounded-xl p-5">
              <BudgetSection proposalId={proposal.id} isAdmin={isAdmin} />
            </div>
          )}

          {/* Author actions for DRAFT */}
          {canSubmit && (
            <div className="border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Actions</h3>
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleStatusChange('OPEN')}
                disabled={moderating}
              >
                {moderating ? 'Submitting...' : 'Submit for Review'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Opens the proposal for community review
              </p>
            </div>
          )}

          {/* Admin moderation panel */}
          {isAdmin && (
            <AdminModerationPanel
              proposal={proposal}
              houses={houses}
              moderating={moderating}
              onStatusChange={handleStatusChange}
              onReject={() => setShowRejectModal(true)}
            />
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold mb-2">Reject Proposal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting this proposal.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Budget constraints, outside scope of community rules..."
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={!rejectionReason.trim() || moderating}
                onClick={() =>
                  handleStatusChange('REJECTED', { rejectionReason: rejectionReason.trim() })
                }
              >
                {moderating ? 'Rejecting...' : 'Reject Proposal'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const isRejected = currentStatus === 'REJECTED';
  const currentIndex = STATUS_FLOW.indexOf(currentStatus as typeof STATUS_FLOW[number]);

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle size={16} />
        <span>Proposal Rejected</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {STATUS_FLOW.map((status, index) => {
        const done = index <= currentIndex;
        const active = status === currentStatus;
        const Icon = done ? CheckCircle : Clock;

        return (
          <div key={status} className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-5 shrink-0">
              <Icon
                size={16}
                className={done ? 'text-primary' : 'text-muted-foreground/40'}
              />
              {index < STATUS_FLOW.length - 1 && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 w-px h-3 mt-0.5 ${
                    done && index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs ${
                active
                  ? 'font-semibold text-primary'
                  : done
                  ? 'text-foreground'
                  : 'text-muted-foreground/60'
              }`}
            >
              {PROPOSAL_STATUS_LABELS[status]}
            </span>
            {active && (
              <ChevronRight size={12} className="text-primary ml-auto shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdminModerationPanel({
  proposal,
  houses,
  moderating,
  onStatusChange,
  onReject,
}: {
  proposal: Proposal;
  houses: House[];
  moderating: boolean;
  onStatusChange: (status: string, opts?: { responsibleHouseId?: string }) => void;
  onReject: () => void;
}) {
  const [selectedHouseId, setSelectedHouseId] = useState('');

  const adminActions: Array<{ label: string; status: string; variant?: 'default' | 'destructive' | 'outline' }> = [];

  if (proposal.status === 'OPEN') {
    adminActions.push({ label: 'Move to Voting', status: 'VOTING' });
    adminActions.push({ label: 'Reject', status: 'REJECTED', variant: 'destructive' });
  }
  if (proposal.status === 'VOTING') {
    adminActions.push({ label: 'Approve', status: 'APPROVED' });
    adminActions.push({ label: 'Reject', status: 'REJECTED', variant: 'destructive' });
  }
  if (proposal.status === 'APPROVED') {
    adminActions.push({ label: 'Mark In Progress', status: 'IN_PROGRESS' });
  }
  if (proposal.status === 'IN_PROGRESS') {
    adminActions.push({ label: 'Mark Completed', status: 'COMPLETED' });
  }

  if (adminActions.length === 0 && proposal.status !== 'OPEN' && proposal.status !== 'VOTING') {
    return null;
  }

  return (
    <div className="border rounded-xl p-5 border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10">
      <h3 className="text-sm font-semibold mb-4 text-amber-900 dark:text-amber-100">
        Admin Actions
      </h3>

      {/* Assign responsible house */}
      {houses.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
            Assign Responsible Unit
          </label>
          <div className="flex gap-2">
            <select
              value={selectedHouseId}
              onChange={(e) => setSelectedHouseId(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border bg-background focus:outline-none"
            >
              <option value="">Select unit...</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={!selectedHouseId || moderating}
              onClick={() =>
                onStatusChange(proposal.status, { responsibleHouseId: selectedHouseId })
              }
            >
              Assign
            </Button>
          </div>
          {proposal.responsibleHouseId && (
            <p className="text-xs text-muted-foreground mt-1">
              Currently assigned: {houses.find((h) => h.id === proposal.responsibleHouseId)?.name || proposal.responsibleHouseId}
            </p>
          )}
        </div>
      )}

      {/* Status actions */}
      <div className="space-y-2">
        {adminActions.map((action) => (
          <Button
            key={action.status}
            size="sm"
            variant={action.variant || 'default'}
            className="w-full"
            disabled={moderating}
            onClick={() => {
              if (action.status === 'REJECTED') {
                onReject();
              } else {
                onStatusChange(action.status);
              }
            }}
          >
            {moderating ? 'Processing...' : action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ProposalDetailSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="skeleton h-4 w-40 mb-6" />
      <div className="border rounded-xl p-6 mb-6">
        <div className="skeleton h-6 w-64 mb-2" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 skeleton h-64 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}
