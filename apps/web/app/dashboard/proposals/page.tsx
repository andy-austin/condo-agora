'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_PROPOSALS,
  type Proposal,
  type GetProposalsResponse,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_CATEGORY_LABELS,
  STATUS_COLORS,
  STATUSES,
  CATEGORIES,
} from '@/lib/queries/proposal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { Lightbulb, Plus, Calendar, User, ChevronDown } from 'lucide-react';

const ME_QUERY = `
  query Me {
    me {
      id
      memberships {
        organization { id, name }
        role
      }
    }
  }
`;

type MeResponse = {
  me: {
    id: string;
    memberships: { organization: { id: string; name: string }; role: string }[];
  } | null;
};

export default function ProposalsPage() {
  const { getAuthToken } = useAuthToken();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('newest');

  const fetchProposals = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);

      const meData = await client.request<MeResponse>(ME_QUERY);
      if (!meData.me || meData.me.memberships.length === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      const membership = meData.me.memberships[0];
      const orgId = membership.organization.id;
      setOrganizationId(orgId);

      const variables: Record<string, string> = { organizationId: orgId };
      if (statusFilter) variables.status = statusFilter;
      if (categoryFilter) variables.category = categoryFilter;

      const data = await client.request<GetProposalsResponse>(GET_PROPOSALS, variables);
      setProposals(data.proposals);
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setError('Failed to load proposals.');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOrder === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  if (loading) {
    return <ProposalsSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load proposals"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Proposals' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Community improvement ideas from residents
          </p>
        </div>
        {organizationId && (
          <Button asChild>
            <Link href="/dashboard/proposals/new">
              <Plus size={16} className="mr-2" />
              New Proposal
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROPOSAL_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PROPOSAL_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Proposal Grid */}
      {sortedProposals.length === 0 ? (
        <EmptyState
          filtered={!!(statusFilter || categoryFilter)}
          onClearFilters={() => {
            setStatusFilter('');
            setCategoryFilter('');
          }}
          organizationId={organizationId}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Link
      href={`/dashboard/proposals/${proposal.id}`}
      className="group border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      {/* Category + Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}
        </span>
        <Badge variant="outline" className="text-xs">
          {PROPOSAL_CATEGORY_LABELS[proposal.category] || proposal.category}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
        {proposal.title}
      </h3>

      {/* Description preview */}
      <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
        {proposal.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span className="flex items-center gap-1">
          <User size={11} />
          Author
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {new Date(proposal.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
  organizationId,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  organizationId: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lightbulb size={28} className="text-primary" />
      </div>
      {filtered ? (
        <>
          <h3 className="font-semibold mb-1">No proposals match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting the filters to see more results.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        </>
      ) : (
        <>
          <h3 className="font-semibold mb-1">No proposals yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to suggest an improvement for the community!
          </p>
          {organizationId && (
            <Button asChild>
              <Link href="/dashboard/proposals/new">
                <Plus size={16} className="mr-2" />
                New Proposal
              </Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ProposalsSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="skeleton h-4 w-24 mb-6" />
      <div className="flex justify-between mb-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-36 rounded-lg" />
      </div>
      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-9 w-36 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
