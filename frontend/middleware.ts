import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: true,
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  
  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/([^\/]+)/);
  const locale = localeMatch?.[1];
  
  // Set NEXT_LOCALE cookie if we have a valid locale
  if (locale && routing.locales.includes(locale as any)) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax'
    });
  }
  
  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|uploads|.*\\..*).*)']
};
