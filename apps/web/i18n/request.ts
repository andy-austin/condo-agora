import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

function getLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header (e.g., "es-UY,es;q=0.9,en;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 1;
      return { locale: locale.split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first matching locale
  for (const { locale } of languages) {
    if (locales.includes(locale as Locale)) {
      return locale as Locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  // Check for locale cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return {
      locale: localeCookie,
      messages: (await import(`../messages/${localeCookie}.json`)).default
    };
  }

  // Fall back to Accept-Language header detection
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  const detectedLocale = getLocaleFromHeaders(acceptLanguage);

  return {
    locale: detectedLocale,
    messages: (await import(`../messages/${detectedLocale}.json`)).default
  };
});
