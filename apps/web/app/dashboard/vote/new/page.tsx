'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import { CREATE_VOTING_SESSION } from '@/lib/queries/voting';
import { GET_PROPOSALS, type Proposal } from '@/lib/queries/proposal';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { Vote } from 'lucide-react';

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

export default function NewVotingSessionPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
        if (!token) return;
    const client = getApiClient();

    try {
      const meData = await client.request<MeResponse>(ME_QUERY);
      const membership = meData.me?.memberships?.[0];
      if (!membership || membership.role !== 'ADMIN') {
        router.push('/dashboard/vote');
        return;
      }
      const orgId = membership.organization.id;
      setOrganizationId(orgId);

      const data = await client.request<{ proposals: Proposal[] }>(
        GET_PROPOSALS,
        { organizationId: orgId, status: 'VOTING' }
      );
      setProposals(data.proposals || []);
    } catch {
      setError(t('voting.failedToLoadProposals'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleProposal = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationId || !title.trim() || selectedIds.size === 0) return;

        if (!token) return;
    const client = getApiClient();

    try {
      setSubmitting(true);
      setError(null);
      await client.request(CREATE_VOTING_SESSION, {
        organizationId,
        title: title.trim(),
        proposalIds: Array.from(selectedIds),
        startDate: startDate || null,
        endDate: endDate || null,
      });
      router.push('/dashboard/vote');
    } catch {
      setError(t('voting.failedToCreateSession'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('voting.breadcrumb'), href: '/dashboard/vote' },
          { label: t('voting.newSession') },
        ]}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Vote className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('voting.newSessionTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">
            {t('voting.sessionTitleLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={t('voting.sessionTitlePlaceholder')}
            maxLength={200}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="startDate"
            >
              {t('voting.startDate')}
            </label>
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="endDate">
              {t('voting.endDate')}
            </label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t('voting.proposalsToVote')} <span className="text-red-500">*</span>
          </label>
          {proposals.length === 0 ? (
            <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
              {t('voting.noVotingProposals')}{' '}
              <Link href="/dashboard/proposals" className="text-primary underline">
                Move proposals to VOTING
              </Link>{' '}
              first.
            </div>
          ) : (
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {proposals.map((proposal) => (
                <label
                  key={proposal.id}
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(proposal.id)}
                    onChange={() => toggleProposal(proposal.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{proposal.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`labels.category.${proposal.category}`)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedIds.size}{' '}
              {selectedIds.size !== 1
                ? t('common.proposals')
                : t('common.proposal')}{' '}
              {selectedIds.size !== 1
                ? t('voting.selectedPlural')
                : t('voting.selectedSingular')}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/vote">
            <Button type="button" variant="outline">
              {t('common.cancel')}
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={
              submitting ||
              !title.trim() ||
              selectedIds.size === 0
            }
          >
            {submitting ? t('common.creating') : t('voting.createSession')}
          </Button>
        </div>
      </form>
    </div>
  );
}
