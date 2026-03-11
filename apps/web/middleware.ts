import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

// 1. Clerk Protection
const isPublicRoute = createRouteMatcher([
  '/',
  '/health',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/(.*)/sign-in(.*)',
  '/(.*)/sign-up(.*)'
]);

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

// Paths excluded from the profile-completion redirect
const isProfileExcludedRoute = createRouteMatcher([
  '/complete-profile',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // 2. Profile completion redirect
  // Prerequisite: `unsafe_metadata` must be exposed in session claims via
  // the Clerk Dashboard JWT template (Session > Customize session token).
  const { userId, sessionClaims } = await auth();
  if (
    userId &&
    !isProfileExcludedRoute(request) &&
    (sessionClaims?.unsafe_metadata as Record<string, unknown> | undefined)
      ?.requires_profile_completion === true
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/complete-profile';
    return NextResponse.redirect(url);
  }

  // 3. Locale Management
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  if (localeCookie && locales.includes(localeCookie as any)) {
    return NextResponse.next();
  }

  const acceptLanguage = request.headers.get('accept-language');
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