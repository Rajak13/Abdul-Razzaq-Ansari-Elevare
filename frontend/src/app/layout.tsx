import type { Metadata } from 'next';
import { Inter } from "next/font/google";
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/providers/query-provider';
import { VideoCallNotificationProvider } from '@/components/video-call/video-call-notification';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elevare - Collaborative Learning Platform',
  description: 'A comprehensive platform for collaborative learning and academic success',
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/favicon-for-public/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-for-public/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <VideoCallNotificationProvider>
                {children}
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
      </body>
    </html>
  );
}
