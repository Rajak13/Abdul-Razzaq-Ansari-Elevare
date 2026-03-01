'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  FileText,
  AlertTriangle,
  LogOut,
  User,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Home', href: '/admin/dashboard', icon: Home }, // Changed to Home for bottom nav convention
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Moderation', href: '/admin/moderation', icon: Shield },
  { name: 'Config', href: '/admin/configuration', icon: Settings }, // Shortened name
  // { name: 'Audit', href: '/admin/audit', icon: FileText }, // Reduced items for mobile bottom nav space
  // { name: 'Security', href: '/admin/security', icon: AlertTriangle },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { admin } = useAdminAuth();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-sans pb-24">
      {/* Main content */}
      <main className="w-full">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-50">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center transition-colors duration-200 ${isActive
                  ? 'text-dashboard-primary'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Profile / Logout Tab */}
        <Link
          href="/admin/profile"
          className="flex flex-col items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </Link>
      </nav>
      
      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
