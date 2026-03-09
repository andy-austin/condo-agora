'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GET_PENDING_INVITATIONS,
  REVOKE_INVITATION,
  RESEND_INVITATION,
  type Invitation,
  type PendingInvitationsResponse,
} from '@/lib/queries/invitation';
import { Clock, Mail, RotateCw, Trash2 } from 'lucide-react';

type PendingInvitationsTableProps = {
  organizationId: string;
  getAuthToken: () => Promise<string | null>;
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function PendingInvitationsTable({
  organizationId,
  getAuthToken,
  t,
}: PendingInvitationsTableProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<PendingInvitationsResponse>(
        GET_PENDING_INVITATIONS,
        { organizationId }
      );
      setInvitations(data.pendingInvitations);
    } catch (err) {
      console.error('Failed to fetch pending invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, getAuthToken]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRevoke = async (invitationId: string) => {
    setActionLoading(invitationId);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request(REVOKE_INVITATION, { invitationId });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request(RESEND_INVITATION, { invitationId });
      await fetchInvitations();
    } catch (err) {
      console.error('Failed to resend invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-xl p-6">
        <div className="skeleton h-6 w-48 mb-4" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="border rounded-xl">
      <div className="p-4 border-b flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">{t('settings.pendingInvitations')}</h2>
        <Badge variant="secondary" className="ml-auto">
          {invitations.length}
        </Badge>
      </div>

      {invitations.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {t('settings.noPendingInvitations')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settings.email')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settings.role')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  {t('settings.sentDate')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  {t('settings.expiresDate')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settings.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{inv.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={inv.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {inv.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResend(inv.id)}
                        disabled={actionLoading === inv.id}
                        title={t('settings.resendInvite')}
                      >
                        <RotateCw size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={actionLoading === inv.id}
                        className="text-destructive hover:text-destructive"
                        title={t('settings.revokeInvite')}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
