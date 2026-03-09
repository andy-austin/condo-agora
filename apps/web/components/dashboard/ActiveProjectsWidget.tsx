'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getApiClient } from '@/lib/api';
import { GET_PROPOSALS, type Proposal } from '@/lib/queries/proposal';
import { ArrowRight, Loader2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

const GET_PROJECT_MILESTONES_COUNT = `
  query GetProjectMilestones($proposalId: String!) {
    projectMilestones(proposalId: $proposalId) {
      id
      status
    }
  }
`;

interface ProjectWithProgress extends Proposal {
  milestoneTotal: number;
  milestoneCompleted: number;
}

interface ActiveProjectsWidgetProps {
  organizationId: string;
}

export default function ActiveProjectsWidget({
  organizationId,
}: ActiveProjectsWidgetProps) {
  const t = useTranslations('dashboard');
  const { getAuthToken } = useAuthToken();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const client = getApiClient(token);
    try {
      const data = await client.request<{ proposals: Proposal[] }>(
        GET_PROPOSALS,
        { organizationId, status: 'IN_PROGRESS' }
      );
      const inProgress = data.proposals || [];

      // Fetch milestone counts for each
      const withProgress = await Promise.all(
        inProgress.slice(0, 5).map(async (p) => {
          try {
            const mData = await client.request<{
              projectMilestones: { id: string; status: string }[];
            }>(GET_PROJECT_MILESTONES_COUNT, { proposalId: p.id });
            const milestones = mData.projectMilestones || [];
            return {
              ...p,
              milestoneTotal: milestones.length,
              milestoneCompleted: milestones.filter(
                (m) => m.status === 'COMPLETED'
              ).length,
            };
          } catch {
            return { ...p, milestoneTotal: 0, milestoneCompleted: 0 };
          }
        })
      );
      setProjects(withProgress);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, organizationId]);

  useState(() => {
    fetchProjects();
  });

  if (loading) {
    return (
      <div className="border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{t('activeProjects.title')}</h2>
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">{t('activeProjects.title')}</h2>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/proposals?status=IN_PROGRESS">
            {t('common.viewAll')} <ArrowRight size={14} className="ml-1" />
          </Link>
        </Button>
      </div>
      <div className="space-y-4">
        {projects.map((project) => {
          const pct =
            project.milestoneTotal > 0
              ? (project.milestoneCompleted / project.milestoneTotal) * 100
              : 0;
          return (
            <Link
              key={project.id}
              href={`/dashboard/proposals/${project.id}`}
              className="block group"
            >
              <div className="p-3 rounded-lg border hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                    {project.title}
                  </span>
                  {project.milestoneTotal > 0 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {project.milestoneCompleted}/{project.milestoneTotal}
                    </span>
                  )}
                </div>
                {project.milestoneTotal > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {project.milestoneTotal === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('activeProjects.noMilestones')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
