'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('languageSwitcher');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    // Set cookie and refresh
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => {
      router.refresh();
    });
  };

  const otherLocale = locale === 'es' ? 'en' : 'es';
  const otherLocaleName = locale === 'es' ? t('en') : t('es');

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => switchLocale(otherLocale)}
      disabled={isPending}
      className="gap-2"
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{otherLocaleName}</span>
      <span className="sm:hidden">{otherLocale.toUpperCase()}</span>
    </Button>
  );
}
