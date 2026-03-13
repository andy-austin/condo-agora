'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Home,
  Users,
  AlertCircle,
  MessageCircle,
  Mail,
  Clock,
  Info,
} from 'lucide-react';
import { type PropertyRow } from '../lib/csv-parser';
import { type BulkSetupResult } from '@/lib/queries/onboarding';

type ConfirmationStepProps = {
  orgName: string;
  rows: PropertyRow[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  result: BulkSetupResult | null;
  onGoToDashboard: () => void;
  onBack: () => void;
};

export function ConfirmationStep({
  orgName,
  rows,
  onSubmit,
  isSubmitting,
  result,
  onGoToDashboard,
  onBack,
}: ConfirmationStepProps) {
  const t = useTranslations('onboarding');
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Computed stats from rows (pre-submission preview)
  const previewStats = useMemo(() => {
    const total = rows.length;
    const withContact = rows.filter(
      (r) => r.phone?.trim() || r.email?.trim()
    ).length;
    const noContact = total - withContact;
    return { total, withContact, noContact };
  }, [rows]);

  // Fire confetti when result arrives
  useEffect(() => {
    if (result) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [result]);

  const handleSubmit = async () => {
    setError('');
    try {
      await onSubmit();
      setHasSubmitted(true);
    } catch {
      setError(t('errorRetry'));
    }
  };

  // Use actual result data when available, otherwise preview stats
  const stats = result
    ? {
        total: result.bulkSetupOrganization.totalProperties,
        withContact: result.bulkSetupOrganization.totalResidents,
        noContact: result.bulkSetupOrganization.propertiesWithoutContact,
      }
    : previewStats;

  return (
    <div>
      {/* Celebratory header */}
      <div className="text-center mb-6">
        <span className="text-5xl block mb-3">🎉</span>
        <h2 className="text-xl font-bold mb-1">{t('confirmTitle')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('confirmSubtitle', { orgName })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Home className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">
              {t('confirmProperties')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{stats.withContact}</p>
            <p className="text-xs text-muted-foreground">
              {t('confirmVoters')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold">{stats.noContact}</p>
            <p className="text-xs text-muted-foreground">
              {t('confirmNoContact')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* What happens next */}
      {!hasSubmitted && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">
            {t('confirmNextTitle')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('confirmWhatsapp')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('confirmWhatsappSub')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('confirmEmail')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('confirmEmailSub')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('confirmPending')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('confirmPendingSub')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual-channel info box */}
      {!hasSubmitted && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{t('confirmDualNote')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      {!hasSubmitted ? (
        <div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('confirmLoading')}
              </>
            ) : (
              t('confirmCta')
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t('confirmCtaNote')}
          </p>
          <div className="mt-4 flex justify-start">
            <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
              {t('back')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            onClick={onGoToDashboard}
            className="w-full"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
