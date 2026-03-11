'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import {
  CREATE_PROPOSAL,
  type CreateProposalResponse,
  CATEGORIES,
} from '@/lib/queries/proposal';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import { ErrorState } from '@/components/dashboard/states';
import { FileText } from 'lucide-react';

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

export default function NewProposalPage() {
  const router = useRouter();
  const t = useTranslations('dashboard');

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const client = getApiClient();
      const data = await client.request<MeResponse>(ME_QUERY);

      if (!data.me || data.me.memberships.length === 0) {
        setOrgError(t('proposals.mustBeInOrg'));
        return;
      }
      setOrganizationId(data.me.memberships[0].organization.id);
    } catch (err) {
      console.error('Failed to fetch org:', err);
      setOrgError('Failed to load organization data.');
    } finally {
      setLoadingOrg(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const handleSubmit = async (e: FormEvent, submitStatus: 'DRAFT' | 'OPEN') => {
    e.preventDefault();
    if (!organizationId) return;
    if (!title.trim()) {
      setFormError(t('proposals.titleRequired'));
      return;
    }
    if (description.trim().length < 10) {
      setFormError(t('proposals.descriptionMinLength'));
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const client = getApiClient();
      const data = await client.request<CreateProposalResponse>(CREATE_PROPOSAL, {
        organizationId,
        title: title.trim(),
        description: description.trim(),
        category,
        status: submitStatus,
      });

      router.push(`/dashboard/proposals/${data.createProposal.id}`);
    } catch (err) {
      console.error('Failed to create proposal:', err);
      const message =
        err instanceof Error ? err.message : t('proposals.failedToCreate');
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrg) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="skeleton h-4 w-40 mb-8" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (orgError) {
    return (
      <ErrorState
        title={t('proposals.cannotCreate')}
        message={orgError}
        onRetry={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <Breadcrumb
        items={[
          { label: t('proposals.title'), href: '/dashboard/proposals' },
          { label: t('proposals.newProposalTitle') },
        ]}
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('proposals.newProposalTitle')}</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('proposals.newProposalDescription')}
        </p>
      </div>

      <div className="border rounded-xl p-6">
        <form className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="title">
              {t('proposals.titleLabel')}
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('proposals.titlePlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('proposals.titleCharCount', { count: title.length })}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="category">
              {t('proposals.categoryLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {t(`labels.category.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="description">
              {t('proposals.descriptionLabel')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('proposals.descriptionPlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={8}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('proposals.descriptionHint')}
            </p>
          </div>

          {/* Error */}
          {formError && (
            <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e as unknown as FormEvent, 'DRAFT')}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? t('common.saving') : t('proposals.saveAsDraft')}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as FormEvent, 'OPEN')}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? t('common.submitting') : t('proposals.submitForReviewBtn')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              asChild
              disabled={submitting}
            >
              <Link href="/dashboard/proposals">{t('common.cancel')}</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
