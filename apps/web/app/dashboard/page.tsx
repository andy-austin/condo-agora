'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import { GET_HOUSES, type House, type GetHousesResponse } from '@/lib/queries/house';
import {
  GET_ORGANIZATION_MEMBERS,
  type Member,
  type GetMembersResponse,
} from '@/lib/queries/members';
import { StatCardsSkeleton } from '@/components/dashboard/states';
import { ErrorState } from '@/components/dashboard/states';
import {
  Building2,
  Users,
  Mail,
  Lightbulb,
  Plus,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnnouncementsSection from '@/components/dashboard/AnnouncementsSection';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ActiveProjectsWidget from '@/components/dashboard/ActiveProjectsWidget';

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

type DashboardData = {
  organizationId: string;
  organizationName: string;
  isAdmin: boolean;
  houses: House[];
  members: Member[];
};

export default function DashboardPage() {
  const { user } = useUser();
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const meData = await client.request<MeResponse>(ME_QUERY);

      if (!meData.me || meData.me.memberships.length === 0) {
        setData({
          organizationId: '',
          organizationName: '',
          isAdmin: false,
          houses: [],
          members: [],
        });
        setLoading(false);
        return;
      }

      const membership = meData.me.memberships[0];
      const orgId = membership.organization.id;

      const [housesData, membersData] = await Promise.all([
        client.request<GetHousesResponse>(GET_HOUSES, { organizationId: orgId }),
        client.request<GetMembersResponse>(GET_ORGANIZATION_MEMBERS, {
          organizationId: orgId,
        }),
      ]);

      setData({
        organizationId: orgId,
        organizationName: membership.organization.name,
        isAdmin: membership.role === 'ADMIN',
        houses: housesData.houses,
        members: membersData.organizationMembers,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <StatCardsSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-64 rounded-xl" />
          </div>
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('overview.couldNotLoad')}
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const totalProperties = data?.houses.length ?? 0;
  const totalResidents = data?.members.length ?? 0;
  const totalAdmins = data?.members.filter((m) => m.role === 'ADMIN').length ?? 0;
  const unassignedMembers =
    data?.members.filter((m) => !m.houseId).length ?? 0;

  // Onboarding checklist
  const hasOrg = !!data?.organizationName;
  const hasProperty = totalProperties > 0;
  const hasMembers = totalResidents > 1; // more than just the admin
  const onboardingComplete = hasOrg && hasProperty && hasMembers;
  const onboardingSteps = [
    {
      label: t('overview.stepJoinOrg'),
      done: hasOrg,
      href: '/onboarding',
    },
    {
      label: t('overview.stepAddProperty'),
      done: hasProperty,
      href: '/dashboard/properties',
    },
    {
      label: t('overview.stepInviteResident'),
      done: hasMembers,
      href: '/dashboard/settings',
    },
  ];

  const stats = [
    {
      label: t('overview.properties'),
      value: totalProperties,
      icon: Building2,
      href: '/dashboard/properties',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: t('overview.members'),
      value: totalResidents,
      icon: Users,
      href: '/dashboard/committee',
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      label: t('overview.boardMembers'),
      value: totalAdmins,
      icon: Mail,
      href: '/dashboard/committee',
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: t('overview.unassigned'),
      value: unassignedMembers,
      icon: Lightbulb,
      href: '/dashboard/committee',
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">
          {t('overview.welcomeBack', { name: user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User' })}
        </h1>
        {data?.organizationName && (
          <p className="text-muted-foreground mt-1">
            {t('overview.orgOverview', { orgName: data.organizationName })}
          </p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}
                >
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                {t('overview.viewDetails')} <ArrowRight size={12} />
              </p>
            </Link>
          );
        })}
      </div>

      {/* Announcements */}
      {data?.organizationId && (
        <AnnouncementsSection
          organizationId={data.organizationId}
          isAdmin={data.isAdmin}
        />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Quick Actions + Recent Members + Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          {data?.isAdmin && (
            <div className="border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">{t('overview.quickActions')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/dashboard/properties">
                    <Plus size={16} className="mr-2 text-primary" />
                    {t('overview.addProperty')}
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/dashboard/settings">
                    <UserPlus size={16} className="mr-2 text-primary" />
                    {t('overview.inviteMember')}
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/dashboard/committee">
                    <Users size={16} className="mr-2 text-primary" />
                    {t('overview.manageCommittee')}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Recent Members */}
          <div className="border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('overview.recentMembers')}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/committee">
                  {t('common.viewAll')} <ArrowRight size={14} className="ml-1" />
                </Link>
              </Button>
            </div>

            {data?.members && data.members.length > 0 ? (
              <div className="space-y-3">
                {data.members.slice(0, 5).map((member) => {
                  const name =
                    member.firstName || member.lastName
                      ? [member.firstName, member.lastName].filter(Boolean).join(' ')
                      : member.email;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.houseName
                              ? t('overview.unitLabel', { name: member.houseName })
                              : t('common.noUnitAssigned')}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                          member.role === 'ADMIN'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('overview.noMembersYet')}
              </p>
            )}
          </div>

          {/* Activity Feed */}
          {data?.organizationId && (
            <ActivityFeed organizationId={data.organizationId} />
          )}

          {/* Active Projects */}
          {data?.organizationId && (
            <ActiveProjectsWidget organizationId={data.organizationId} />
          )}
        </div>

        {/* Right column - Onboarding + Properties */}
        <div className="space-y-6">
          {/* Onboarding Checklist - only show if incomplete */}
          {!onboardingComplete && (
            <div className="border rounded-xl p-6 bg-primary/5 border-primary/20">
              <h2 className="text-lg font-semibold mb-1">{t('overview.gettingStarted')}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t('overview.completeSteps')}
              </p>

              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${(onboardingSteps.filter((s) => s.done).length / onboardingSteps.length) * 100}%`,
                  }}
                />
              </div>

              <div className="space-y-3">
                {onboardingSteps.map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className={`flex items-center gap-3 text-sm py-1 transition-colors ${
                      step.done
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground hover:text-primary'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={18} className="text-muted-foreground shrink-0" />
                    )}
                    {step.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Properties Summary */}
          <div className="border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('overview.propertiesSummary')}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/properties">
                  {t('common.viewAll')} <ArrowRight size={14} className="ml-1" />
                </Link>
              </Button>
            </div>

            {data?.houses && data.houses.length > 0 ? (
              <div className="space-y-2">
                {data.houses.slice(0, 5).map((house) => (
                  <Link
                    key={house.id}
                    href={`/dashboard/properties/${house.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 size={16} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{house.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {house.residents.length}{' '}
                      {house.residents.length === 1 ? t('common.resident') : t('common.residents')}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('overview.noPropertiesYet')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
