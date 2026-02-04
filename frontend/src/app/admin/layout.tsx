import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import './admin.css';
import { AdminProviders } from '@/components/admin/admin-providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elevare Admin Dashboard',
  description: 'Privacy-preserving administrative interface for Elevare platform',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
