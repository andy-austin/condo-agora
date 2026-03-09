'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_ORGANIZATION_MEMBERS,
  UPDATE_MEMBER_ROLE,
  type Member,
  type GetMembersResponse,
  type UpdateMemberRoleResponse,
} from '@/lib/queries/members';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState, ListSkeleton } from '@/components/dashboard/states';

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

export default function CommitteePage() {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMembers = useCallback(
    async (orgId: string) => {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<GetMembersResponse>(
        GET_ORGANIZATION_MEMBERS,
        { organizationId: orgId }
      );
      return data.organizationMembers;
    },
    [getAuthToken]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const meData = await client.request<MeResponse>(ME_QUERY);

        if (!meData.me || meData.me.memberships.length === 0) {
          setError(t('committee.notInOrg'));
          setLoading(false);
          return;
        }

        const membership = meData.me.memberships[0];
        const orgId = membership.organization.id;
        setOrganizationName(membership.organization.name);
        setIsAdmin(membership.role === 'ADMIN');

        const memberList = await fetchMembers(orgId);
        setMembers(memberList);
      } catch (err) {
        console.error('Failed to load members:', err);
        setError(t('committee.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [getAuthToken, fetchMembers, t]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingId(memberId);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UpdateMemberRoleResponse>(
        UPDATE_MEMBER_ROLE,
        { memberId, role: newRole }
      );

      setMembers(
        members.map((m) =>
          m.id === memberId ? { ...m, role: data.updateMemberRole.role } : m
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update role.';
      alert(message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8 space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load committee"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const admins = members.filter((m) => m.role === 'ADMIN');
  const others = members.filter((m) => m.role !== 'ADMIN');

  const getMemberDisplayName = (m: Member) => {
    if (m.firstName || m.lastName) {
      return [m.firstName, m.lastName].filter(Boolean).join(' ');
    }
    return m.email;
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default' as const;
      case 'RESIDENT':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('committee.title')}</h1>
        {organizationName && (
          <p className="text-muted-foreground mt-1">
            {t('committee.subtitle', { orgName: organizationName })}
          </p>
        )}
      </div>

      {/* Admins section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('committee.boardMembers')}</CardTitle>
            <Badge>{admins.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('committee.noAdmins')}</p>
          ) : (
            <div className="space-y-3">
              {admins.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  displayName={getMemberDisplayName(member)}
                  roleBadgeVariant={roleBadgeVariant}
                  isAdmin={isAdmin}
                  isUpdating={updatingId === member.id}
                  onRoleChange={handleRoleChange}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other members section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('committee.membersAndResidents')}</CardTitle>
            <Badge variant="secondary">{others.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('committee.noOtherMembers')}
            </p>
          ) : (
            <div className="space-y-3">
              {others.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  displayName={getMemberDisplayName(member)}
                  roleBadgeVariant={roleBadgeVariant}
                  isAdmin={isAdmin}
                  isUpdating={updatingId === member.id}
                  onRoleChange={handleRoleChange}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  displayName,
  roleBadgeVariant,
  isAdmin,
  isUpdating,
  onRoleChange,
  t,
}: {
  member: Member;
  displayName: string;
  roleBadgeVariant: (role: string) => 'default' | 'secondary' | 'outline';
  isAdmin: boolean;
  isUpdating: boolean;
  onRoleChange: (memberId: string, newRole: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div>
        <p className="text-sm font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">{member.email}</p>
        {member.houseName && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('overview.unitLabel', { name: member.houseName })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={roleBadgeVariant(member.role)}>{member.role}</Badge>
        {isAdmin && (
          <select
            className="text-xs border rounded px-2 py-1 bg-background"
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isUpdating}
            aria-label={`Change role for ${displayName}`}
          >
            <option value="ADMIN">{t('labels.roles.admin')}</option>
            <option value="RESIDENT">{t('labels.roles.resident')}</option>
            <option value="MEMBER">{t('labels.roles.member')}</option>
          </select>
        )}
      </div>
    </div>
  );
}
