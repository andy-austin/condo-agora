import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

// 1. Route Protection
const publicPaths = [
  '/',
  '/health',
  '/login',
  '/invite',
  '/api/auth',
  '/api/graphql',
  '/api/webhooks',
];

function isPublicRoute(pathname: string): boolean {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
}

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
    if (locales.includes(locale as any)) {
      return locale;
    }
  }

  return defaultLocale;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Route protection: redirect unauthenticated users to /login
  if (!isPublicRoute(pathname) && !req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Locale Management
  const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;

  if (localeCookie && locales.includes(localeCookie as any)) {
    return NextResponse.next();
  }

  const acceptLanguage = req.headers.get('accept-language');
  const detectedLocale = getLocaleFromHeaders(acceptLanguage);

  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
