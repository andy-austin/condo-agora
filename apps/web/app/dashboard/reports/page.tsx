'use client';

import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_COMMUNITY_ANALYTICS,
  GET_PARTICIPATION_REPORT,
  type CommunityAnalytics,
  type ParticipationReport,
} from '@/lib/queries/analytics';
import {
  GET_FINANCIAL_SUMMARY,
  type FinancialSummary,
  formatCurrency,
} from '@/lib/queries/budget';
import { GET_VOTING_SESSIONS, type VotingSession } from '@/lib/queries/voting';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Vote,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';

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

const CATEGORY_COLORS: Record<string, string> = {
  SECURITY: 'bg-red-500',
  INFRASTRUCTURE: 'bg-blue-500',
  COMMON_AREAS: 'bg-green-500',
  MAINTENANCE: 'bg-yellow-500',
  FINANCIAL: 'bg-purple-500',
  OTHER: 'bg-gray-500',
};

export default function ReportsPage() {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [analytics, setAnalytics] = useState<CommunityAnalytics | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [participationReport, setParticipationReport] = useState<ParticipationReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const meData = await client.request<MeResponse>(ME_QUERY);

      if (!meData.me || meData.me.memberships.length === 0) {
        setLoading(false);
        return;
      }

      const membership = meData.me.memberships[0];
      const orgId = membership.organization.id;
      setIsAdmin(membership.role === 'ADMIN');

      const [analyticsData, financialData, sessionsData] = await Promise.all([
        client.request<{ communityAnalytics: CommunityAnalytics }>(GET_COMMUNITY_ANALYTICS, {
          organizationId: orgId,
        }),
        client.request<{ financialSummary: FinancialSummary }>(GET_FINANCIAL_SUMMARY, {
          organizationId: orgId,
        }),
        client.request<{ votingSessions: VotingSession[] }>(GET_VOTING_SESSIONS, {
          organizationId: orgId,
        }),
      ]);

      setAnalytics(analyticsData.communityAnalytics);
      setFinancial(financialData.financialSummary);
      setSessions(sessionsData.votingSessions);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(t('reports.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchParticipationReport = useCallback(
    async (sessionId: string) => {
      setLoadingReport(true);
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const data = await client.request<{ participationReport: ParticipationReport }>(
          GET_PARTICIPATION_REPORT,
          { sessionId }
        );
        setParticipationReport(data.participationReport);
      } catch (err) {
        console.error('Failed to load participation report:', err);
        setParticipationReport(null);
      } finally {
        setLoadingReport(false);
      }
    },
    [getAuthToken]
  );

  useEffect(() => {
    if (selectedSessionId && isAdmin) {
      fetchParticipationReport(selectedSessionId);
    }
  }, [selectedSessionId, isAdmin, fetchParticipationReport]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('reports.couldNotLoad')}
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const totalCategories = analytics?.categoryBreakdown.reduce((sum, c) => sum + c.count, 0) || 1;
  const spentPercentage = financial && financial.totalApproved > 0
    ? Math.round((financial.totalSpent / financial.totalApproved) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <Breadcrumb items={[{ label: t('reports.title') }]} />

      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">{t('reports.pageTitle')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('reports.subtitle')}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label={t('reports.totalProposals')}
          value={analytics?.totalProposals ?? 0}
          color="text-blue-600 bg-blue-100"
        />
        <MetricCard
          icon={CheckCircle2}
          label={t('reports.approved')}
          value={analytics?.approvedProposals ?? 0}
          sub={analytics && analytics.totalProposals > 0
            ? `${Math.round(analytics.approvalRate * 100)}% ${t('reports.rate')}`
            : undefined}
          color="text-green-600 bg-green-100"
        />
        <MetricCard
          icon={Clock}
          label={t('reports.activeProjects')}
          value={analytics?.activeProjects ?? 0}
          color="text-purple-600 bg-purple-100"
        />
        <MetricCard
          icon={XCircle}
          label={t('reports.rejected')}
          value={analytics?.rejectedProposals ?? 0}
          color="text-red-600 bg-red-100"
        />
      </div>

      {/* Financial Summary */}
      {financial && (
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">{t('reports.financialSummary')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('reports.totalApproved')}</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(financial.totalApproved, financial.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('reports.totalSpent')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(financial.totalSpent, financial.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('reports.remaining')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(financial.totalRemaining, financial.currency)}
              </p>
            </div>
          </div>
          {/* Spent progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">{t('reports.budgetUtilization')}</span>
              <span className="font-medium">{spentPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${spentPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {financial.projectCount} {financial.projectCount !== 1 ? t('common.projects') : t('common.project')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">{t('reports.categoryBreakdown')}</h2>
          </div>
          {analytics && analytics.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryBreakdown.map((cat) => {
                const pct = Math.round((cat.count / totalCategories) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{t(`labels.category.${cat.category}`)}</span>
                      <span className="text-muted-foreground">
                        {cat.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CATEGORY_COLORS[cat.category] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('reports.noProposalData')}
            </p>
          )}
        </div>

        {/* Monthly Trends */}
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold">{t('reports.monthlyTrends')}</h2>
          </div>
          {analytics && analytics.monthlyTrends.length > 0 ? (
            <div className="space-y-2">
              {analytics.monthlyTrends.map((trend) => {
                const maxCount = Math.max(...analytics.monthlyTrends.map((t) => t.count), 1);
                const pct = Math.round((trend.count / maxCount) * 100);
                return (
                  <div key={trend.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {trend.month}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded flex items-center pl-2"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">
                          {trend.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('reports.noTrendsData')}
            </p>
          )}
        </div>
      </div>

      {/* Top Contributors */}
      {analytics && analytics.topContributors.length > 0 && (
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-amber-600" />
            <h2 className="text-lg font-semibold">{t('reports.topContributors')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{t('reports.rank')}</th>
                  <th className="pb-2 font-medium">{t('reports.user')}</th>
                  <th className="pb-2 font-medium text-center">{t('proposals.title')}</th>
                  <th className="pb-2 font-medium text-center">{t('proposals.comments')}</th>
                  <th className="pb-2 font-medium text-center">{t('reports.score')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topContributors.map((c, i) => (
                  <tr key={c.userId} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium truncate max-w-[200px]">
                      {c.userId}
                    </td>
                    <td className="py-2 text-center">{c.proposalsCount}</td>
                    <td className="py-2 text-center">{c.commentsCount}</td>
                    <td className="py-2 text-center font-semibold">{c.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Participation Reports (Admin only) */}
      {isAdmin && sessions.length > 0 && (
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Vote size={20} className="text-indigo-600" />
            <h2 className="text-lg font-semibold">{t('reports.participationReports')}</h2>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-muted-foreground">{t('reports.selectSession')}</label>
            <div className="relative">
              <select
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value || null)}
                className="appearance-none border rounded-lg px-3 py-2 pr-8 text-sm bg-background"
              >
                <option value="">{t('reports.chooseSession')}</option>
                {sessions
                  .filter((s) => s.status === 'CLOSED')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          {loadingReport && (
            <div className="skeleton h-32 rounded-lg" />
          )}

          {participationReport && !loadingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{participationReport.totalHouses}</p>
                  <p className="text-xs text-muted-foreground">{t('voting.totalUnits')}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{participationReport.votesCast}</p>
                  <p className="text-xs text-muted-foreground">{t('voting.votesCast')}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {Math.round(participationReport.participationRate * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t('reports.turnout')}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {participationReport.nonVotedHouseIds.length}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('reports.didNotVote')}</p>
                </div>
              </div>

              {/* Participation bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t('reports.participationRateLabel')}</span>
                  <span className="font-medium">
                    {Math.round(participationReport.participationRate * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(participationReport.participationRate * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {!selectedSessionId && !loadingReport && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('reports.selectClosedSession')}
            </p>
          )}
        </div>
      )}

      {/* Last Session Participation */}
      {analytics && analytics.lastSessionParticipationRate > 0 && (
        <div className="border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">{t('reports.lastSessionParticipation')}</h2>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-indigo-600">
              {Math.round(analytics.lastSessionParticipationRate * 100)}%
            </div>
            <div className="flex-1">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.round(analytics.lastSessionParticipationRate * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('reports.ofUnitsParticipated')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ComponentType<{ size?: number | string }>;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
