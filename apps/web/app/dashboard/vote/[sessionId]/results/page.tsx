'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  GET_VOTING_RESULTS,
  GET_VOTING_SESSION,
  type VotingResults,
  type VotingSession,
  type ProposalScore,
  SESSION_STATUS_COLORS,
} from '@/lib/queries/voting';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { BarChart2, CheckCircle2, XCircle, Users, Loader2 } from 'lucide-react';

export default function VotingResultsPage() {
  const t = useTranslations('dashboard');
  const { sessionId } = useParams<{ sessionId: string }>();

  const [results, setResults] = useState<VotingResults | null>(null);
  const [session, setSession] = useState<VotingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const client = getApiClient();

    try {
      setLoading(true);
      const [sessionData, resultsData] = await Promise.all([
        client.request<{ votingSession: VotingSession }>(GET_VOTING_SESSION, {
          id: sessionId,
        }),
        client.request<{ votingResults: VotingResults }>(GET_VOTING_RESULTS, {
          sessionId,
        }),
      ]);
      setSession(sessionData.votingSession);
      setResults(resultsData.votingResults);
    } catch {
      setError(t('voting.failedToLoadResults'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    fetchData();
    // Poll every 30s if session is open
    const interval = setInterval(async () => {
      if (session?.status === 'OPEN') {
        await fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, session?.status]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !results) return <ErrorState message={error || t('voting.noResults')} />;

  const scores = results.proposalScores ?? [];
  const maxScore = Math.max(...scores.map((p) => p.score), 1);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('voting.breadcrumb'), href: '/dashboard/vote' },
          {
            label: session?.title || 'Session',
            href: `/dashboard/vote/${sessionId}`,
          },
          { label: t('voting.results') },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{results.sessionTitle}</h1>
              {session && (
                <Badge className={SESSION_STATUS_COLORS[session.status]}>
                  {t(`labels.sessionStatus.${session.status}`)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t('voting.votingResults')}</p>
          </div>
        </div>
        {session?.status === 'OPEN' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('voting.live')}
          </div>
        )}
      </div>

      {/* Participation Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{results.votesCast}</div>
          <div className="text-xs text-muted-foreground">{t('voting.votesCast')}</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{results.totalHouses}</div>
          <div className="text-xs text-muted-foreground">{t('voting.totalUnits')}</div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {results.participationRate.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">{t('voting.participation')}</div>
        </div>
      </div>

      {/* Participation Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            {t('voting.participationRate')}
          </div>
          <span className="font-medium">
            {results.votesCast}/{results.totalHouses} {t('common.units')}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(results.participationRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Rankings */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('voting.proposalRankings')}
        </h2>
        <div className="space-y-3">
          {scores.map((ps) => (
            <ProposalResultCard key={ps.proposalId} ps={ps} maxScore={maxScore} t={t} />
          ))}
        </div>
      </div>

      {scores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t('voting.noVotesYet')}
        </div>
      )}
    </div>
  );
}

function ProposalResultCard({
  ps,
  maxScore,
  t,
}: {
  ps: ProposalScore;
  maxScore: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const barWidth = maxScore > 0 ? (ps.score / maxScore) * 100 : 0;
  const approvalWidth = Math.min(ps.approvalPercentage, 100);
  const meetsThreshold = ps.isApproved;

  return (
    <div
      className={`border rounded-lg p-4 ${meetsThreshold ? 'border-green-200 bg-green-50/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-muted-foreground w-7">
            #{ps.rank}
          </span>
          <div>
            <div className="font-medium">{ps.title}</div>
            <div className="text-xs text-muted-foreground">
              {t('voting.score', { score: ps.score })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {meetsThreshold ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium text-xs">
                {t('voting.approved', { pct: ps.approvalPercentage.toFixed(0) })}
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-muted-foreground text-xs">
                {t('voting.approvalPct', { pct: ps.approvalPercentage.toFixed(0) })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-2">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${meetsThreshold ? 'bg-green-500' : 'bg-primary'}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Approval bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
          <span>{t('voting.approvalThreshold')}</span>
          <span>{ps.approvalPercentage.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${meetsThreshold ? 'bg-green-400' : 'bg-amber-400'}`}
            style={{ width: `${approvalWidth}%` }}
          />
        </div>
        {/* 66% marker */}
        <div className="relative h-0">
          <div
            className="absolute top-[-6px] w-0.5 h-4 bg-red-400"
            style={{ left: '66%' }}
          />
        </div>
      </div>
    </div>
  );
}
