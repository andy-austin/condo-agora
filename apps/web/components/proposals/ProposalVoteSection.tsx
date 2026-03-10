'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  PROPOSAL_VOTE_RESULTS,
  MY_PROPOSAL_VOTE,
  START_PROPOSAL_VOTE,
  CAST_PROPOSAL_VOTE,
  CLOSE_PROPOSAL_VOTE,
  type ProposalVoteResultsResponse,
  type MyProposalVoteResponse,
  type StartProposalVoteResponse,
  type CastProposalVoteResponse,
  type CloseProposalVoteResponse,
  type ProposalVoteResults,
  type ProposalVote,
} from '@/lib/queries/proposal-vote';
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';

type Props = {
  proposalId: string;
  organizationId: string;
  voteStatus: string | null;
  voteThreshold: number | null;
  isAdmin: boolean;
  houseId: string | null;
  getAuthToken: () => Promise<string | null>;
  onProposalUpdate: () => void;
};

export default function ProposalVoteSection({
  proposalId,
  organizationId,
  voteStatus,
  voteThreshold,
  isAdmin,
  houseId,
  getAuthToken,
  onProposalUpdate,
}: Props) {
  const t = useTranslations('dashboard.proposalVote');

  const [results, setResults] = useState<ProposalVoteResults | null>(null);
  const [myVote, setMyVote] = useState<ProposalVote | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [threshold, setThreshold] = useState(66);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasVote = voteStatus === 'ACTIVE' || voteStatus === 'CLOSED';

  const fetchVoteData = useCallback(async () => {
    if (!hasVote) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);

      const promises: Promise<unknown>[] = [
        client.request<ProposalVoteResultsResponse>(PROPOSAL_VOTE_RESULTS, {
          proposalId,
        }),
      ];

      if (houseId && voteStatus === 'ACTIVE') {
        promises.push(
          client.request<MyProposalVoteResponse>(MY_PROPOSAL_VOTE, {
            proposalId,
            houseId,
          })
        );
      }

      const [resultsData, myVoteData] = await Promise.all(promises);
      setResults((resultsData as ProposalVoteResultsResponse).proposalVoteResults);
      if (myVoteData) {
        setMyVote((myVoteData as MyProposalVoteResponse).myProposalVote);
      }
    } catch (err) {
      console.error('Failed to load vote data:', err);
    } finally {
      setLoading(false);
    }
  }, [proposalId, houseId, voteStatus, hasVote, getAuthToken]);

  useEffect(() => {
    fetchVoteData();
  }, [fetchVoteData]);

  // Poll for live results when vote is active
  useEffect(() => {
    if (voteStatus !== 'ACTIVE') return;
    const interval = setInterval(fetchVoteData, 15000);
    return () => clearInterval(interval);
  }, [voteStatus, fetchVoteData]);

  const handleStartVote = async () => {
    setActing(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<StartProposalVoteResponse>(START_PROPOSAL_VOTE, {
        proposalId,
        threshold,
      });
      onProposalUpdate();
    } catch (err) {
      console.error('Failed to start vote:', err);
      const message = err instanceof Error ? err.message : 'Failed to start vote.';
      alert(message);
    } finally {
      setActing(false);
    }
  };

  const handleCastVote = async (vote: 'YES' | 'NO') => {
    if (!houseId) return;
    setActing(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<CastProposalVoteResponse>(CAST_PROPOSAL_VOTE, {
        proposalId,
        houseId,
        vote,
      });
      setMyVote(data.castProposalVote);
      await fetchVoteData();
      onProposalUpdate();
    } catch (err) {
      console.error('Failed to cast vote:', err);
      const message = err instanceof Error ? err.message : 'Failed to cast vote.';
      alert(message);
    } finally {
      setActing(false);
    }
  };

  const handleCloseVote = async () => {
    setActing(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<CloseProposalVoteResponse>(CLOSE_PROPOSAL_VOTE, {
        proposalId,
      });
      setShowCloseConfirm(false);
      onProposalUpdate();
    } catch (err) {
      console.error('Failed to close vote:', err);
      const message = err instanceof Error ? err.message : 'Failed to close vote.';
      alert(message);
    } finally {
      setActing(false);
    }
  };

  // No active vote and admin: show start button
  if (!hasVote && isAdmin) {
    return (
      <div className="border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">{t('startVote')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              {t('threshold')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-20 text-sm px-2.5 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('thresholdHint')}</p>
          </div>
          <Button size="sm" className="w-full" onClick={handleStartVote} disabled={acting}>
            {acting ? t('starting') : t('startVote')}
          </Button>
        </div>
      </div>
    );
  }

  // No vote and not admin: nothing to show
  if (!hasVote) return null;

  // Has vote — show results and voting UI
  return (
    <div className="border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{t('results')}</h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            voteStatus === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {voteStatus === 'ACTIVE' ? t('voteActive') : t('voteClosed')}
        </span>
      </div>

      {/* Results bar */}
      {results && (
        <div className="space-y-3 mb-4">
          {/* YES/NO bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-600 font-medium">
                {t('yes')} {results.yesCount}
              </span>
              <span className="text-red-600 font-medium">
                {t('no')} {results.noCount}
              </span>
            </div>
            <div className="relative h-5 rounded-full bg-gray-100 overflow-hidden">
              {results.yesCount + results.noCount > 0 ? (
                <>
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-l-full transition-all duration-300"
                    style={{
                      width: `${(results.yesCount / (results.yesCount + results.noCount)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 bg-red-400 rounded-r-full transition-all duration-300"
                    style={{
                      width: `${(results.noCount / (results.yesCount + results.noCount)) * 100}%`,
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-gray-200" />
              )}
              {/* Threshold marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-yellow-600 z-10"
                style={{ left: `${results.threshold}%` }}
                title={`${t('thresholdLine')}: ${results.threshold}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{results.yesPercentage}%</span>
              <span className="text-yellow-600">
                {t('thresholdLine')}: {results.threshold}%
              </span>
            </div>
          </div>

          {/* Participation */}
          <div className="text-xs text-muted-foreground">
            {t('participation')}: {results.yesCount + results.noCount} / {results.totalHouses}
          </div>

          {/* Approval status */}
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              results.isApproved ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            {results.isApproved ? (
              <>
                <CheckCircle size={14} />
                {t('approved')}
              </>
            ) : (
              <>
                <XCircle size={14} />
                {t('notApproved')}
              </>
            )}
          </div>
        </div>
      )}

      {loading && !results && (
        <div className="text-xs text-muted-foreground mb-4">{t('loading')}</div>
      )}

      {/* Voting buttons (active vote + has house) */}
      {voteStatus === 'ACTIVE' && houseId && (
        <div className="space-y-2 mb-4">
          {myVote ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t('yourVote')}:</span>
                <span
                  className={`font-semibold ${
                    myVote.vote === 'YES' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {myVote.vote === 'YES' ? t('yes') : t('no')}
                </span>
              </div>
              <button
                className="text-xs text-primary underline hover:no-underline"
                onClick={() => setMyVote(null)}
              >
                {t('changeVote')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleCastVote('YES')}
                disabled={acting}
              >
                <ThumbsUp size={14} className="mr-1.5" />
                {t('castYes')}
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => handleCastVote('NO')}
                disabled={acting}
              >
                <ThumbsDown size={14} className="mr-1.5" />
                {t('castNo')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Not designated voter message */}
      {voteStatus === 'ACTIVE' && !houseId && (
        <p className="text-xs text-muted-foreground mb-4">
          {t('noHouseAssigned')}
        </p>
      )}

      {/* Admin close vote button */}
      {voteStatus === 'ACTIVE' && isAdmin && (
        <div className="border-t pt-3 mt-3">
          {showCloseConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('closeVoteConfirm')}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCloseVote}
                  disabled={acting}
                >
                  {acting ? '...' : t('closeVote')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowCloseConfirm(true)}
            >
              {t('closeVote')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
