'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  CREATE_PROPOSAL,
  type CreateProposalResponse,
  PROPOSAL_CATEGORY_LABELS,
  CATEGORIES,
} from '@/lib/queries/proposal';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { ErrorState } from '@/components/dashboard/states';
import { FileText } from 'lucide-react';

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

export default function NewProposalPage() {
  const router = useRouter();
  const { getAuthToken } = useAuthToken();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<MeResponse>(ME_QUERY);

      if (!data.me || data.me.memberships.length === 0) {
        setOrgError('You must be a member of an organization to create proposals.');
        return;
      }
      setOrganizationId(data.me.memberships[0].organization.id);
    } catch (err) {
      console.error('Failed to fetch org:', err);
      setOrgError('Failed to load organization data.');
    } finally {
      setLoadingOrg(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleSubmit = async (e: FormEvent, submitStatus: 'DRAFT' | 'OPEN') => {
    e.preventDefault();
    if (!organizationId) return;
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<CreateProposalResponse>(CREATE_PROPOSAL, {
        organizationId,
        title: title.trim(),
        description: description.trim(),
        category,
        status: submitStatus,
      });

      router.push(`/dashboard/proposals/${data.createProposal.id}`);
    } catch (err) {
      console.error('Failed to create proposal:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to create proposal.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrg) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="skeleton h-4 w-40 mb-8" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (orgError) {
    return (
      <ErrorState
        title="Cannot create proposal"
        message={orgError}
        onRetry={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Proposals', href: '/dashboard/proposals' },
          { label: 'New Proposal' },
        ]}
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">New Proposal</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Submit a community improvement idea. Save as draft to continue editing later,
          or submit for review to open it for community discussion.
        </p>
      </div>

      <div className="border rounded-xl p-6">
        <form className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="title">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Replace lobby lighting with LED fixtures"
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/200 characters
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="category">
              Category <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {PROPOSAL_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="description">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem you're trying to solve, the proposed solution, and the expected benefits for the community..."
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 10 characters. Be specific about the issue and proposed solution.
            </p>
          </div>

          {/* Error */}
          {formError && (
            <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e as unknown as FormEvent, 'DRAFT')}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as FormEvent, 'OPEN')}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              asChild
              disabled={submitting}
            >
              <Link href="/dashboard/proposals">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
