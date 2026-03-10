'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_VOTING_SESSION,
  GET_MY_VOTE,
  CAST_VOTE,
  OPEN_VOTING_SESSION,
  CLOSE_VOTING_SESSION,
  type VotingSession,
  type Vote,
  SESSION_STATUS_COLORS,
} from '@/lib/queries/voting';
import { GET_PROPOSALS, type Proposal } from '@/lib/queries/proposal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import {
  Vote as VoteIcon,
  GripVertical,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  BarChart2,
  Loader2,
} from 'lucide-react';

const ME_QUERY = `
  query Me {
    me {
      id
      memberships {
        organization { id, name }
        role
        houseId
      }
    }
  }
`;

type MeResponse = {
  me: {
    id: string;
    memberships: {
      organization: { id: string; name: string };
      role: string;
      houseId: string | null;
    }[];
  } | null;
};

export default function VotingSessionPage() {
  const t = useTranslations('dashboard');
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getAuthToken } = useAuthToken();
  const router = useRouter();

  const [session, setSession] = useState<VotingSession | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rankedProposals, setRankedProposals] = useState<Proposal[]>([]);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [houseId, setHouseId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);

    try {
      setLoading(true);
      const meData = await client.request<MeResponse>(ME_QUERY);
      const membership = meData.me?.memberships?.[0];
      if (!membership) {
        setError(t('voting.noOrgFound'));
        return;
      }
      setIsAdmin(membership.role === 'ADMIN');
      if (membership.houseId) setHouseId(membership.houseId);

      const sessionData = await client.request<{
        votingSession: VotingSession;
      }>(GET_VOTING_SESSION, { id: sessionId });

      const sess = sessionData.votingSession;
      if (!sess) {
        setError(t('voting.sessionNotFound'));
        return;
      }
      setSession(sess);

      if (sess.proposalIds.length > 0) {
        const orgId = membership.organization.id;
        const proposalData = await client.request<{ proposals: Proposal[] }>(
          GET_PROPOSALS,
          { organizationId: orgId }
        );
        const all = proposalData.proposals || [];
        const inSession = all.filter((p) => sess.proposalIds.includes(p.id));
        setProposals(inSession);
        setRankedProposals([...inSession]);
      }

      if (membership.houseId && sess.status === 'OPEN') {
        try {
          const voteData = await client.request<{ myVote: Vote | null }>(
            GET_MY_VOTE,
            { sessionId, houseId: membership.houseId }
          );
          if (voteData.myVote) {
            setMyVote(voteData.myVote);
            setSubmitted(true);
          }
        } catch {
          // no vote yet
        }
      }
    } catch {
      setError(t('voting.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, sessionId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setRankedProposals((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === rankedProposals.length - 1) return;
    setRankedProposals((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSubmitVote = async () => {
    if (!houseId || !session) return;
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);

    try {
      setSubmitting(true);
      setError(null);
      const rankings = rankedProposals.map((p, idx) => ({
        proposal_id: p.id,
        rank: idx + 1,
      }));
      await client.request(CAST_VOTE, {
        sessionId: session.id,
        houseId,
        rankings,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSession = async () => {
    if (!session) return;
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);
    try {
      setActionLoading(true);
      const data = await client.request<{ openVotingSession: VotingSession }>(
        OPEN_VOTING_SESSION,
        { sessionId: session.id }
      );
      setSession(data.openVotingSession);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to open session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);
    try {
      setActionLoading(true);
      await client.request(CLOSE_VOTING_SESSION, { sessionId: session.id });
      router.push(`/dashboard/vote/${session.id}/results`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to close session');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !session)
    return <ErrorState message={error || t('voting.sessionNotFound')} />;

  if (!session) return <ErrorState message={t('voting.sessionNotFound')} />;

  const isOpen = session.status === 'OPEN';
  const isDraft = session.status === 'DRAFT';
  const isClosed = session.status === 'CLOSED';

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('voting.breadcrumb'), href: '/dashboard/vote' },
          { label: session.title },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <VoteIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <Badge className={SESSION_STATUS_COLORS[session.status]}>
                {t(`labels.sessionStatus.${session.status}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {proposals.length}{' '}
              {proposals.length !== 1
                ? t('common.proposals')
                : t('common.proposal')}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/vote/${session.id}/results`}>
          <Button size="sm" variant="outline">
            <BarChart2 className="w-4 h-4 mr-1" />
            {t('voting.results')}
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-6 p-4 border rounded-lg bg-amber-50 border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            {t('voting.adminControls')}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <Button
                size="sm"
                onClick={handleOpenSession}
                disabled={actionLoading || proposals.length === 0}
              >
                {actionLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                {t('voting.openForVoting')}
              </Button>
            )}
            {isOpen && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCloseSession}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                {t('voting.closeAndCalculate')}
              </Button>
            )}
            {isClosed && (
              <Link href={`/dashboard/vote/${session.id}/results`}>
                <Button size="sm">{t('voting.viewFinalResults')}</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Voting Interface */}
      {isOpen && !submitted && (
        <div>
          {!houseId ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <p>{t('voting.mustBeAssignedUnit')}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('voting.dragInstruction')}
              </p>
              <div className="space-y-2 mb-6">
                {rankedProposals.map((proposal, idx) => (
                  <div
                    key={proposal.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                  >
                    <span className="text-2xl font-bold text-muted-foreground w-8 text-center">
                      {idx + 1}
                    </span>
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{proposal.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`labels.category.${proposal.category}`)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === rankedProposals.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmitVote}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  t('voting.submitVote')
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Already Voted */}
      {isOpen && submitted && (
        <div className="text-center py-12 border rounded-lg bg-green-50 border-green-200">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">
            {t('voting.voteSubmitted')}
          </h3>
          <p className="text-sm text-green-700 mt-1 mb-4">
            {t('voting.rankingRecorded')}
          </p>
          {myVote && (
            <div className="text-left max-w-xs mx-auto">
              <p className="text-xs font-medium text-green-800 mb-2">
                {t('voting.yourRanking')}
              </p>
              {myVote.rankings
                .sort((a, b) => a.rank - b.rank)
                .map((r) => {
                  const p = proposals.find((p) => p.id === r.proposalId);
                  return (
                    <div
                      key={r.proposalId}
                      className="flex items-center gap-2 text-xs text-green-700 mb-1"
                    >
                      <span className="font-bold">{r.rank}.</span>
                      <span>{p?.title || r.proposalId}</span>
                    </div>
                  );
                })}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setSubmitted(false)}
          >
            {t('voting.changeVote')}
          </Button>
        </div>
      )}

      {/* Closed state */}
      {isClosed && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {t('voting.sessionClosed')}
          </p>
          <Link href={`/dashboard/vote/${session.id}/results`}>
            <Button>{t('voting.viewResults')}</Button>
          </Link>
        </div>
      )}

      {/* Draft state (non-admin) */}
      {isDraft && !isAdmin && (
        <div className="text-center py-12 border rounded-lg text-muted-foreground">
          <p>{t('voting.notOpenYet')}</p>
        </div>
      )}
    </div>
  );
}
