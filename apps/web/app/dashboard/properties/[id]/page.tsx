'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_HOUSE,
  UPDATE_HOUSE,
  REMOVE_RESIDENT_FROM_HOUSE,
  type House,
  type GetHouseResponse,
  type UpdateHouseResponse,
  type RemoveResidentResponse,
} from '@/lib/queries/house';
import {
  GET_ORGANIZATION_MEMBERS,
  type Member,
  type GetMembersResponse,
} from '@/lib/queries/members';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import AssignResidentDialog from '@/components/properties/AssignResidentDialog';
import {
  Building2,
  Users,
  Calendar,
  Pencil,
  FileText,
  Lightbulb,
  History,
  LayoutDashboard,
} from 'lucide-react';

const ME_QUERY = `
  query Me {
    me {
      id
      memberships {
        organization { id }
        role
      }
    }
  }
`;

type MeResponse = {
  me: {
    id: string;
    memberships: { organization: { id: string }; role: string }[];
  } | null;
};

const detailTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'residents', label: 'Residents', icon: Users },
  { id: 'proposals', label: 'Proposals', icon: Lightbulb, disabled: true },
  { id: 'documents', label: 'Documents', icon: FileText, disabled: true },
  { id: 'history', label: 'History', icon: History, disabled: true },
];

export default function HouseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const houseId = params.id as string;
  const activeTab = searchParams.get('tab') || 'overview';
  const { getAuthToken } = useAuthToken();

  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHouse = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);

      const [houseData, meData] = await Promise.all([
        client.request<GetHouseResponse>(GET_HOUSE, { id: houseId }),
        client.request<MeResponse>(ME_QUERY),
      ]);

      if (!houseData.house) {
        setError('Property not found.');
        return;
      }

      setHouse(houseData.house);
      setEditName(houseData.house.name);

      if (meData.me) {
        const membership = meData.me.memberships.find(
          (m) => m.organization.id === houseData.house!.organizationId
        );
        setIsAdmin(membership?.role === 'ADMIN');
      }
    } catch (err) {
      console.error('Failed to load property:', err);
      setError('Failed to load property details.');
    } finally {
      setLoading(false);
    }
  }, [houseId, getAuthToken]);

  useEffect(() => {
    fetchHouse();
  }, [fetchHouse]);

  const handleSave = async () => {
    if (!editName.trim() || !house) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const data = await client.request<UpdateHouseResponse>(UPDATE_HOUSE, {
        id: house.id,
        name: editName.trim(),
      });

      setHouse({ ...house, name: data.updateHouse.name });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update property:', err);
      alert('Failed to update property name.');
    } finally {
      setSaving(false);
    }
  };

  const setTab = (tabId: string) => {
    router.push(`/dashboard/properties/${houseId}?tab=${tabId}`, { scroll: false });
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !house) {
    return (
      <ErrorState
        title="Property not found"
        message={error || 'The property you are looking for does not exist.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const occupancyStatus = house.residents.length > 0 ? 'Occupied' : 'Vacant';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Properties', href: '/dashboard/properties' },
          { label: house.name },
        ]}
      />

      {/* Property Header */}
      <div className="border rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Property icon placeholder */}
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 size={28} className="text-primary" />
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    className="text-xl font-semibold bg-background border rounded-lg px-3 py-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditName(house.name);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold">{house.name}</h1>
                  {isAdmin && (
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      aria-label="Edit property name"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={house.residents.length > 0 ? 'default' : 'outline'}>
                  {occupancyStatus}
                </Badge>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {house.residents.length} {house.residents.length === 1 ? 'resident' : 'residents'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Created {new Date(house.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-0 overflow-x-auto">
          {detailTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            if (tab.disabled) {
              return (
                <div
                  key={tab.id}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground/50 cursor-not-allowed whitespace-nowrap border-b-2 border-transparent"
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Soon</span>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab house={house} />}
      {activeTab === 'residents' && (
        <ResidentsTab
          house={house}
          isAdmin={isAdmin}
          getAuthToken={getAuthToken}
          onRefresh={fetchHouse}
        />
      )}
    </div>
  );
}

// ---------- Overview Tab ----------

function OverviewTab({ house }: { house: House }) {
  const stats = [
    { label: 'Total Residents', value: house.residents.length, icon: Users },
    {
      label: 'Status',
      value: house.residents.length > 0 ? 'Occupied' : 'Vacant',
      icon: Building2,
    },
    {
      label: 'Created',
      value: new Date(house.createdAt).toLocaleDateString(),
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Icon size={18} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Residents Quick View */}
      <div className="border rounded-xl p-6">
        <h3 className="text-base font-semibold mb-3">Residents</h3>
        {house.residents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No residents assigned yet. Invite members from the{' '}
            <Link href="/dashboard/settings" className="text-primary hover:underline">
              Settings
            </Link>{' '}
            page.
          </p>
        ) : (
          <div className="space-y-2">
            {house.residents.slice(0, 5).map((resident) => (
              <div
                key={resident.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users size={14} className="text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Member</span>
                    <span className="text-muted-foreground ml-2">
                      ID: {resident.userId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <Badge variant="outline">{resident.role}</Badge>
              </div>
            ))}
            {house.residents.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{house.residents.length - 5} more residents
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Residents Tab ----------

function ResidentsTab({
  house,
  isAdmin,
  getAuthToken,
  onRefresh,
}: {
  house: House;
  isAdmin: boolean;
  getAuthToken: () => Promise<string | null>;
  onRefresh: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = await getAuthToken();
        const client = getApiClient(token);
        const data = await client.request<GetMembersResponse>(
          GET_ORGANIZATION_MEMBERS,
          { organizationId: house.organizationId }
        );
        setMembers(data.organizationMembers);
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    };

    fetchMembers();
  }, [house.organizationId, getAuthToken]);

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  const getMemberDisplay = (userId: string) => {
    const member = memberMap.get(userId);
    if (!member) return { name: 'Member', detail: userId.slice(0, 12) + '...' };
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Member';
    return { name, detail: member.email };
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this resident?')) return;

    setRemoving(userId);
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      await client.request<RemoveResidentResponse>(REMOVE_RESIDENT_FROM_HOUSE, {
        userId,
        organizationId: house.organizationId,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to remove resident:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to remove resident.';
      alert(message);
    } finally {
      setRemoving(null);
    }
  };

  const existingResidentUserIds = house.residents.map((r) => r.userId);

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-base font-semibold">
          All Residents ({house.residents.length})
        </h2>
        {isAdmin && (
          <AssignResidentDialog
            organizationId={house.organizationId}
            houseId={house.id}
            existingResidentUserIds={existingResidentUserIds}
            maxResidents={house.maxResidents ?? 1}
            onAssigned={onRefresh}
            getAuthToken={getAuthToken}
          />
        )}
      </div>

      {house.residents.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-primary" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">
            No residents assigned to this property yet.
          </p>
          {isAdmin && (
            <AssignResidentDialog
              organizationId={house.organizationId}
              houseId={house.id}
              existingResidentUserIds={existingResidentUserIds}
              onAssigned={onRefresh}
              getAuthToken={getAuthToken}
            />
          )}
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Email
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {house.residents.map((resident) => {
              const display = getMemberDisplay(resident.userId);
              return (
                <tr key={resident.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-primary" />
                      </div>
                      <span className="text-sm font-medium">{display.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{resident.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {display.detail}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(resident.userId)}
                        disabled={removing === resident.userId}
                      >
                        {removing === resident.userId ? 'Removing...' : 'Remove'}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Detail Skeleton ----------

function DetailSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="skeleton h-4 w-32 mb-6" />
      <div className="border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="skeleton w-14 h-14 rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-6 w-48" />
            <div className="flex gap-3">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-5 w-32" />
            </div>
          </div>
        </div>
      </div>
      <div className="skeleton h-10 w-full mb-6 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-48 rounded-xl" />
    </div>
  );
}
