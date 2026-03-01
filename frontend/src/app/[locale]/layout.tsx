import type { Metadata } from 'next';
import { Inter } from "next/font/google";
import '../globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/providers/query-provider';
import { VideoCallNotificationProvider } from '@/components/video-call/video-call-notification';
import { MaintenanceGuard } from '@/components/maintenance-guard';
import { MaintenanceNotification } from '@/components/maintenance-notification';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://elevare.app';

  return {
    title: {
      default: t('metadata.home.title'),
      template: '%s'
    },
    description: t('metadata.siteDescription'),
    icons: {
      icon: [
        { url: '/icon.png' },
        { url: '/favicon-for-public/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/favicon-for-public/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/icon.png',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: routing.locales.reduce((acc, loc) => {
        acc[loc] = `${baseUrl}/${loc}`;
        return acc;
      }, {} as Record<string, string>)
    },
    openGraph: {
      title: t('metadata.home.title'),
      description: t('metadata.siteDescription'),
      siteName: t('metadata.siteName'),
      locale,
      type: 'website',
      url: `${baseUrl}/${locale}`,
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params in Next.js 15+
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Load messages for the current locale - explicitly pass locale
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <ThemeProvider>
              <AuthProvider>
                <VideoCallNotificationProvider>
                  <MaintenanceNotification />
                  <MaintenanceGuard>
                    {children}
                  </MaintenanceGuard>
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    expand={false}
                    duration={4000}
                  />
                </VideoCallNotificationProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
