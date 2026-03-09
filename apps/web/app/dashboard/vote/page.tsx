'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_VOTING_SESSIONS,
  type VotingSession,
  SESSION_STATUS_COLORS,
} from '@/lib/queries/voting';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { Vote, Plus, Calendar, BarChart2 } from 'lucide-react';

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

export default function VotingPage() {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);

    try {
      setLoading(true);
      const meData = await client.request<MeResponse>(ME_QUERY);
      const membership = meData.me?.memberships?.[0];
      if (!membership) {
        setError('No organization found');
        return;
      }
      const orgId = membership.organization.id;
      setIsAdmin(membership.role === 'ADMIN');

      const data = await client.request<{ votingSessions: VotingSession[] }>(
        GET_VOTING_SESSIONS,
        { organizationId: orgId }
      );
      setSessions(data.votingSessions || []);
    } catch (e) {
      setError(t('voting.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  const openSessions = sessions.filter((s) => s.status === 'OPEN');
  const otherSessions = sessions.filter((s) => s.status !== 'OPEN');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: t('voting.breadcrumb') }]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Vote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('voting.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('voting.subtitle')}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link href="/dashboard/vote/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('voting.newSession')}
            </Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Vote className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">{t('voting.noSessions')}</p>
          {isAdmin && (
            <p className="text-sm mt-1">
              {t('voting.noSessionsHint')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {openSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('voting.activeSessions')}
              </h2>
              <div className="space-y-3">
                {openSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isAdmin={isAdmin}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {otherSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('voting.allSessions')}
              </h2>
              <div className="space-y-3">
                {otherSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isAdmin={isAdmin}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isAdmin,
  t,
}: {
  session: VotingSession;
  isAdmin: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{session.title}</h3>
            <Badge className={SESSION_STATUS_COLORS[session.status]}>
              {t(`labels.sessionStatus.${session.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {session.proposalIds.length}{' '}
            {session.proposalIds.length !== 1
              ? t('common.proposals')
              : t('common.proposal')}
          </p>
          {session.endDate && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>
                {t('voting.closes', {
                  date: new Date(session.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                })}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {session.status === 'OPEN' && (
            <Link href={`/dashboard/vote/${session.id}`}>
              <Button size="sm">{t('voting.castVote')}</Button>
            </Link>
          )}
          {(session.status === 'CLOSED' || isAdmin) && (
            <Link href={`/dashboard/vote/${session.id}/results`}>
              <Button size="sm" variant="outline">
                <BarChart2 className="w-4 h-4 mr-1" />
                {t('voting.results')}
              </Button>
            </Link>
          )}
          {isAdmin && session.status === 'DRAFT' && (
            <Link href={`/dashboard/vote/${session.id}`}>
              <Button size="sm" variant="outline">
                {t('voting.manage')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
