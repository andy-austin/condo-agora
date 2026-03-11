'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import {
  GET_ORGANIZATION_MEMBERS,
  REMOVE_MEMBER,
  type Member,
  type GetMembersResponse,
} from '@/lib/queries/members';
import {
  Building2,
  Users,
  Shield,
  Bell,
  CreditCard,
  Search,
  UserPlus,
  Mail,
  Trash2,
} from 'lucide-react';
import PendingInvitationsTable from '@/components/settings/PendingInvitationsTable';
import type { Invitation } from '@/lib/queries/invitation';

const ME_QUERY = `
  query Me {
    me {
      id
      email
      memberships {
        organization {
          id
          name
        }
        role
      }
    }
  }
`;

const CREATE_INVITATION = `
  mutation CreateInvitation($email: String!, $organizationId: String!, $role: Role!) {
    createInvitation(email: $email, organizationId: $organizationId, role: $role) {
      id
      email
      role
      method
      expiresAt
      createdAt
    }
  }
`;

type Organization = {
  id: string;
  name: string;
};

type Membership = {
  organization: Organization;
  role: string;
};

type User = {
  id: string;
  email: string;
  memberships: Membership[];
};

type MeQueryResponse = {
  me: User | null;
};

export default function SettingsPage() {
  const t = useTranslations('dashboard');

  const tabs = [
    { id: 'members', label: t('settings.membersAndInvitations'), icon: Users },
    { id: 'organization', label: t('settings.organization'), icon: Building2 },
    { id: 'roles', label: t('settings.rolesAndPermissions'), icon: Shield, disabled: true },
    { id: 'notifications', label: t('settings.notificationsTab'), icon: Bell, disabled: true },
    { id: 'billing', label: t('settings.billing'), icon: CreditCard, disabled: true },
  ];

  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'members';

  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const organizationId = user?.memberships[0]?.organization.id || '';
  const currentMembership = user?.memberships.find(
    (m) => m.organization.id === organizationId
  );
  const isAdmin = currentMembership?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    try {
      const client = getApiClient();
      const meData = await client.request<MeQueryResponse>(ME_QUERY);

      if (meData.me) {
        setUser(meData.me);

        if (meData.me.memberships.length > 0) {
          const orgId = meData.me.memberships[0].organization.id;
          const membersData = await client.request<GetMembersResponse>(
            GET_ORGANIZATION_MEMBERS,
            { organizationId: orgId }
          );
          setMembers(membersData.organizationMembers);
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings data:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setTab = (tabId: string) => {
    router.push(`/dashboard/settings?tab=${tabId}`, { scroll: false });
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load settings"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!user || user.memberships.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <p className="text-muted-foreground">
            {t('settings.noOrgYet')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('settings.title'), href: '/dashboard/settings' },
          { label: tabs.find((tab) => tab.id === activeTab)?.label || t('settings.title') },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <nav className="lg:w-56 shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              if (tab.disabled) {
                return (
                  <div
                    key={tab.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-muted-foreground/50 cursor-not-allowed whitespace-nowrap text-sm"
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{tab.label}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-auto hidden lg:inline">
                      {t('common.soon')}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm text-left w-full ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'members' && (
            <MembersTab
              members={members}
              user={user}
              organizationId={organizationId}
              isAdmin={isAdmin}
              ={}
              onMembersChange={setMembers}
              t={t}
            />
          )}
          {activeTab === 'organization' && (
            <OrganizationTab
              organizationName={currentMembership?.organization.name || ''}
              isAdmin={isAdmin}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Members & Invitations Tab ----------

function MembersTab({
  members,
  user,
  organizationId,
  isAdmin,
  onMembersChange,
  t,
}: {
  members: Member[];
  user: User;
  organizationId: string;
  isAdmin: boolean;
  onMembersChange: (members: Member[]) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteRefresh, setInviteRefresh] = useState(0);
  const [lastCreatedInvitation, setLastCreatedInvitation] = useState<Invitation | null>(null);

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.email.toLowerCase().includes(q) ||
      m.firstName?.toLowerCase().includes(q) ||
      m.lastName?.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    setSubmitting(true);
    setInviteSuccess(false);
    try {
      const client = getApiClient();
      const result = await client.request<{ createInvitation: Invitation }>(
        CREATE_INVITATION, { email, organizationId, role }
      );
      setEmail('');
      setInviteSuccess(true);
      setLastCreatedInvitation(result.createInvitation);
      setInviteRefresh((n) => n + 1);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('already exists')) {
        alert(t('settings.existingUserNotified'));
      } else {
        alert(t('settings.inviteFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    const name = member.firstName || member.lastName
      ? [member.firstName, member.lastName].filter(Boolean).join(' ')
      : member.email;
    if (!confirm(t('settings.removeMemberConfirm', { name }))) return;

    setRemovingId(member.id);
    try {
      const client = getApiClient();
      await client.request(REMOVE_MEMBER, { memberId: member.id });
      onMembersChange(members.filter((m) => m.id !== member.id));
    } catch (err) {
      console.error(err);
      alert(t('settings.removeMemberFailed'));
    } finally {
      setRemovingId(null);
    }
  };

  const getMemberName = (m: Member) => {
    if (m.firstName || m.lastName) {
      return [m.firstName, m.lastName].filter(Boolean).join(' ');
    }
    return m.email;
  };

  return (
    <div className="space-y-6">
      {/* Members Table */}
      <div className="border rounded-xl">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('settings.membersAndInvitations')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('settings.membersCount', { count: members.length })}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('settings.searchMembers')}
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settings.name')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  {t('settings.email')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('settings.role')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  {t('settings.unitCol')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  {t('settings.joined')}
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {search ? t('settings.noMembersMatch') : t('settings.noMembersYet')}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isSelf = member.userId === user.id;
                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{getMemberName(member)}</p>
                            <p className="text-xs text-muted-foreground truncate sm:hidden">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {member.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={member.role === 'ADMIN' ? 'default' : 'secondary'}
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {member.houseName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {!isSelf && (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              disabled={removingId === member.id}
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                              title={t('settings.removeMember')}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Form */}
      {isAdmin && (
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">{t('settings.inviteNewMember')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('settings.inviteSubtitle', { orgName: user.memberships.find(m => m.organization.id === organizationId)?.organization.name || '' })}
          </p>

          {inviteSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" />
              <p className="text-sm text-emerald-700">{t('settings.inviteSent')}</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder={t('settings.emailPlaceholder')}
              className="flex-1 p-2.5 rounded-lg border bg-background text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="p-2.5 rounded-lg border bg-background text-sm sm:w-32"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="MEMBER">{t('labels.roles.member')}</option>
              <option value="ADMIN">{t('labels.roles.admin')}</option>
              <option value="RESIDENT">{t('labels.roles.resident')}</option>
            </select>
            <Button type="submit" disabled={submitting} className="sm:w-auto">
              {submitting ? t('common.sending') : t('settings.sendInvite')}
            </Button>
          </form>
        </div>
      )}

      {/* Pending Invitations */}
      {isAdmin && organizationId && (
        <PendingInvitationsTable
          organizationId={organizationId}
          ={}
          t={t}
          refreshTrigger={inviteRefresh}
          lastCreatedInvitation={lastCreatedInvitation}
        />
      )}
    </div>
  );
}

// ---------- Organization Profile Tab ----------

function OrganizationTab({
  organizationName,
  isAdmin,
  t,
}: {
  organizationName: string;
  isAdmin: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{t('settings.orgProfile')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settings.orgName')}</label>
            <input
              type="text"
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              value={organizationName}
              disabled
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.onlyAdminsCanEdit')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settings.address')}</label>
            <input
              type="text"
              placeholder={t('settings.addressPlaceholder')}
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settings.descriptionLabel')}</label>
            <textarea
              placeholder={t('settings.descriptionPlaceholder')}
              rows={3}
              className="w-full p-2.5 rounded-lg border bg-background text-sm resize-none"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settings.contactEmail')}</label>
            <input
              type="email"
              placeholder={t('settings.contactEmailPlaceholder')}
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              disabled={!isAdmin}
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <Button disabled>
                {t('settings.saveChanges')}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('settings.editComingSoon')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function SettingsSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 shrink-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl" />
          <div className="skeleton h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
