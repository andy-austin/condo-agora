'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/dashboard/states';
import {
  GET_ORGANIZATION_MEMBERS,
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
} from 'lucide-react';

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
      token
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

const tabs = [
  { id: 'members', label: 'Members & Invitations', icon: Users },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, disabled: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, disabled: true },
  { id: 'billing', label: 'Billing', icon: CreditCard, disabled: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'members';

  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuthToken();

  const organizationId = user?.memberships[0]?.organization.id || '';
  const currentMembership = user?.memberships.find(
    (m) => m.organization.id === organizationId
  );
  const isAdmin = currentMembership?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
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
  }, [getAuthToken]);

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
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <p className="text-muted-foreground">
            You do not belong to any organization yet. Please ask an administrator to invite you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your organization, members, and preferences.
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
                      Soon
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
              getAuthToken={getAuthToken}
              onMembersChange={setMembers}
            />
          )}
          {activeTab === 'organization' && (
            <OrganizationTab
              organizationName={currentMembership?.organization.name || ''}
              isAdmin={isAdmin}
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
  getAuthToken,
  onMembersChange,
}: {
  members: Member[];
  user: User;
  organizationId: string;
  isAdmin: boolean;
  getAuthToken: () => Promise<string | null>;
  onMembersChange: (members: Member[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

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
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request(CREATE_INVITATION, { email, organizationId, role });
      setEmail('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to send invitation.');
    } finally {
      setSubmitting(false);
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
            <h2 className="text-lg font-semibold">Members</h2>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'} in your organization
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
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
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Unit
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {search ? 'No members match your search.' : 'No members yet.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
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
                  </tr>
                ))
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
            <h2 className="text-lg font-semibold">Invite New Member</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Send an invitation to join {user.memberships.find(m => m.organization.id === organizationId)?.organization.name || 'your organization'}.
          </p>

          {inviteSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" />
              <p className="text-sm text-emerald-700">Invitation sent successfully!</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="colleague@example.com"
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
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="RESIDENT">Resident</option>
            </select>
            <Button type="submit" disabled={submitting} className="sm:w-auto">
              {submitting ? 'Sending...' : 'Send Invite'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------- Organization Profile Tab ----------

function OrganizationTab({
  organizationName,
  isAdmin,
}: {
  organizationName: string;
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Organization Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Organization Name</label>
            <input
              type="text"
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              value={organizationName}
              disabled
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Only administrators can edit organization details.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input
              type="text"
              placeholder="123 Main St, Suite 100"
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              placeholder="Tell members about your community..."
              rows={3}
              className="w-full p-2.5 rounded-lg border bg-background text-sm resize-none"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Contact Email</label>
            <input
              type="email"
              placeholder="admin@community.com"
              className="w-full p-2.5 rounded-lg border bg-background text-sm"
              disabled={!isAdmin}
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <Button disabled>
                Save Changes
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Organization profile editing will be available in a future update.
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
