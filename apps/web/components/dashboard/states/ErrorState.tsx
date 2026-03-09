'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showDashboardLink?: boolean;
};

export default function ErrorState({
  title,
  message,
  onRetry,
  showDashboardLink = true,
}: ErrorStateProps) {
  const t = useTranslations('dashboard');
  const displayTitle = title ?? t('states.errorTitle');
  const displayMessage = message ?? t('states.errorMessage');

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-destructive" />
        </div>

        <h2 className="text-xl font-semibold mb-2">{displayTitle}</h2>
        <p className="text-muted-foreground mb-6">{displayMessage}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <Button onClick={onRetry}>{t('states.tryAgain')}</Button>
          )}
          {showDashboardLink && (
            <Button variant="outline" asChild>
              <Link href="/dashboard">{t('states.goToDashboard')}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
