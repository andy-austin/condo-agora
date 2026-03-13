'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { type ProfileData } from '../page';
import { PhoneInputField } from '../components/phone-input';

type UserProfileStepProps = {
  data: ProfileData;
  authProvider: string;
  onChange: (data: ProfileData) => void;
  onContinue: () => void;
  onSkip: () => void;
};

export function UserProfileStep({
  data,
  authProvider,
  onChange,
  onContinue,
  onSkip,
}: UserProfileStepProps) {
  const t = useTranslations('onboarding');

  const providerHint =
    authProvider === 'google'
      ? t('profileHintGoogle')
      : authProvider === 'email'
        ? t('profileHintEmail')
        : t('profileHintWhatsapp');

  const inputClass =
    'w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Avatar placeholder */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-1">
          {t('profileTitle')}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-1">
          {t('profileSubtitle')}
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mb-6">
          {providerHint}
        </p>

        <div className="space-y-4">
          {/* First Name / Last Name side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="profile-first-name"
                className="block text-sm font-medium mb-1.5"
              >
                {t('profileFirstName')}
              </label>
              <input
                id="profile-first-name"
                type="text"
                className={inputClass}
                value={data.firstName}
                onChange={(e) =>
                  onChange({ ...data, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label
                htmlFor="profile-last-name"
                className="block text-sm font-medium mb-1.5"
              >
                {t('profileLastName')}
              </label>
              <input
                id="profile-last-name"
                type="text"
                className={inputClass}
                value={data.lastName}
                onChange={(e) =>
                  onChange({ ...data, lastName: e.target.value })
                }
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium mb-1.5"
            >
              {t('profileEmail')}
            </label>
            <input
              id="profile-email"
              type="email"
              className={inputClass}
              value={data.email}
              onChange={(e) =>
                onChange({ ...data, email: e.target.value })
              }
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium mb-1.5"
            >
              {t('profilePhone')}
            </label>
            <PhoneInputField
              value={data.phone}
              onChange={(value) => onChange({ ...data, phone: value })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 items-center">
          <Button onClick={onContinue} className="w-full">
            {t('profileContinue')}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('profileSkip')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
