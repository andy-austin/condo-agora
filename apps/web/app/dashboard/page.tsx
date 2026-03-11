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
      iconColor: 'text-amber-600 bg-amber-100',
      cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50/50',
    },
    {
      label: t('overview.members'),
      value: totalResidents,
      icon: Users,
      href: '/dashboard/committee',
      iconColor: 'text-blue-600 bg-blue-100',
      cardBg: 'bg-gradient-to-br from-blue-50 to-sky-50/50',
    },
    {
      label: t('overview.boardMembers'),
      value: totalAdmins,
      icon: Mail,
      href: '/dashboard/committee',
      iconColor: 'text-emerald-600 bg-emerald-100',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-green-50/50',
    },
    {
      label: t('overview.unassigned'),
      value: unassignedMembers,
      icon: Lightbulb,
      href: '/dashboard/committee',
      iconColor: 'text-purple-600 bg-purple-100',
      cardBg: 'bg-gradient-to-br from-purple-50 to-violet-50/50',
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
              className={`group border rounded-xl p-5 hover-lift ${stat.cardBg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.iconColor}`}
                >
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-3xl font-bold font-display">{stat.value}</p>
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
                <Link
                  href="/dashboard/properties"
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-amber-300 hover:bg-amber-50/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-medium text-center">{t('overview.addProperty')}</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus size={20} />
                  </div>
                  <span className="text-sm font-medium text-center">{t('overview.inviteMember')}</span>
                </Link>
                <Link
                  href="/dashboard/committee"
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <span className="text-sm font-medium text-center">{t('overview.manageCommittee')}</span>
                </Link>
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
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <Users size={24} className="text-blue-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('overview.noMembersYet')}
                </p>
              </div>
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
            <div className="border rounded-xl p-6 bg-gradient-to-br from-primary/5 to-amber-50/50 border-primary/20">
              <h2 className="text-lg font-semibold mb-1">{t('overview.gettingStarted')}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t('overview.completeSteps')}
              </p>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-muted rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-700 ease-out"
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
                    className={`flex items-center gap-3 text-sm py-1.5 transition-colors ${
                      step.done
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground font-medium hover:text-primary'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0 transition-transform" />
                    ) : (
                      <Circle size={20} className="text-muted-foreground/50 shrink-0" />
                    )}
                    {step.label}
                    {!step.done && (
                      <ArrowRight size={14} className="ml-auto text-muted-foreground" />
                    )}
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
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                  <Building2 size={24} className="text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('overview.noPropertiesYet')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
