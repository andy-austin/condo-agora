'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getApiClient } from '@/lib/api';
import { COMPLETE_PROFILE } from '@/lib/queries/onboarding';
import { Button } from '@/components/ui/button';
import { Loader2, User } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const t = useTranslations('completeProfile');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const callCompleteProfile = async () => {
    const client = getApiClient();
    await client.request(COMPLETE_PROFILE, {
      input: {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
      },
    });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await callCompleteProfile();
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Failed to complete profile:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setError('');
    setSaving(true);
    try {
      await callCompleteProfile();
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Failed to skip profile completion:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
          <User className="h-8 w-8 text-indigo-400" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {t('subtitle')}
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="first-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('firstName')}
            </label>
            <input
              id="first-name"
              type="text"
              className="w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="last-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('lastName')}
            </label>
            <input
              id="last-name"
              type="text"
              className="w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className="w-full rounded-lg border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
