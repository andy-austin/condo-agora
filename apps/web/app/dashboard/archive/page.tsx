'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import {
  GET_PROPOSALS,
  type Proposal,
  type GetProposalsResponse,
  STATUS_COLORS,
  CATEGORIES,
} from '@/lib/queries/proposal';
import { ErrorState } from '@/components/dashboard/states';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Archive,
  Search,
  Calendar,
  Tag,
  ChevronDown,
  ArrowRight,
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

export default function ArchivePage() {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const client = getApiClient(token);
      const meData = await client.request<MeResponse>(ME_QUERY);

      if (!meData.me || meData.me.memberships.length === 0) {
        setLoading(false);
        return;
      }

      const orgId = meData.me.memberships[0].organization.id;

      const data = await client.request<GetProposalsResponse>(GET_PROPOSALS, {
        organizationId: orgId,
        status: 'COMPLETED',
      });

      setProposals(data.proposals);
    } catch (err) {
      console.error('Failed to load archive:', err);
      setError(t('archive.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    proposals.forEach((p) => {
      const year = new Date(p.updatedAt).getFullYear().toString();
      yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [proposals]);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (yearFilter) {
        const year = new Date(p.updatedAt).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      return true;
    });
  }, [proposals, searchQuery, categoryFilter, yearFilter]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-12 rounded-lg" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('archive.couldNotLoad')}
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: t('archive.title') }]} />

      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Archive size={28} className="text-emerald-600" />
          {t('archive.pageTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('archive.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={t('archive.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background"
          />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none border rounded-lg px-3 py-2 pr-8 text-sm bg-background"
          >
            <option value="">{t('archive.allCategories')}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`labels.category.${cat}`)}
              </option>
            ))}
          </select>
          <Tag
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        <div className="relative">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="appearance-none border rounded-lg px-3 py-2 pr-8 text-sm bg-background"
          >
            <option value="">{t('archive.allYears')}</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length !== 1 ? t('archive.completedProjects') : t('archive.completedProject')}
        {searchQuery || categoryFilter || yearFilter ? ` ${t('archive.filtered')}` : ''}
      </p>

      {/* Project list */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/dashboard/proposals/${proposal.id}`}
              className="block border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                    {proposal.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {proposal.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS['COMPLETED']}`}
                    >
                      {t('archive.completed')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      {t(`labels.category.${proposal.category}`)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(proposal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1"
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-xl">
          <Archive size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">{t('archive.noProjects')}</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || categoryFilter || yearFilter
              ? t('archive.noProjectsFilterHint')
              : t('archive.noProjectsHint')}
          </p>
          {(searchQuery || categoryFilter || yearFilter) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setYearFilter('');
              }}
            >
              {t('archive.clearFilters')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
