'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type OrgNameStepProps = {
  orgName: string;
  onChange: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export function OrgNameStep({
  orgName,
  onChange,
  onNext,
  onBack,
}: OrgNameStepProps) {
  const t = useTranslations('onboarding');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-center mb-4">
          <span className="text-4xl">🏢</span>
        </div>

        <h2 className="text-xl font-bold text-center mb-1">
          {t('orgTitle')}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {t('orgSubtitle')}
        </p>

        <div>
          <label
            htmlFor="org-name"
            className="block text-sm font-medium mb-1.5"
          >
            {t('orgNameLabel')}
          </label>
          <input
            id="org-name"
            type="text"
            placeholder={t('orgNamePlaceholder')}
            className="w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={orgName}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onBack}>
            {t('back')}
          </Button>
          <Button onClick={onNext} disabled={!orgName.trim()}>
            {t('orgNext')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
