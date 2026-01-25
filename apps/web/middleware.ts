import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

function getLocaleFromHeaders(acceptLanguage: string | null): string {
  if (!acceptLanguage) return defaultLocale;

  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 1;
      return { locale: locale.split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of languages) {
    if (locales.includes(locale as typeof locales[number])) {
      return locale;
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  // Check if locale is already set in cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  if (localeCookie && locales.includes(localeCookie as typeof locales[number])) {
    // Cookie exists and is valid, continue
    return NextResponse.next();
  }

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  const detectedLocale = getLocaleFromHeaders(acceptLanguage);

  // Set locale cookie for future requests
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
