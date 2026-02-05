'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  FileText, 
  Settings, 
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MessageSquare
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/appeals', label: 'Appeals', icon: MessageSquare },
  { href: '/admin/moderation', label: 'Moderation', icon: AlertTriangle },
  { href: '/admin/security', label: 'Security', icon: Shield },
  { href: '/admin/audit', label: 'Audit', icon: FileText },
  { href: '/admin/configuration', label: 'Settings', icon: Settings },
];

// Bottom nav shows first 4 items + More menu for the rest
const bottomNavItems = navItems.slice(0, 4);
const moreNavItems = navItems.slice(4);

// Desktop Sidebar Component
export function AdminSidebar({ isCollapsed, onToggleCollapse }: { 
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      className={`
        hidden lg:block sticky top-0 left-0 h-screen bg-[#F8F7F3] border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section with Collapse Button */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[hsl(142,71%,45%)] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">Elevare Admin</h2>
                  <p className="text-xs text-[#717171]">Management Portal</p>
                </div>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className={`p-2 hover:bg-gray-200 rounded-lg transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-[#717171]" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-[#717171]" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-[hsl(142,71%,45%)] text-white shadow-sm'
                    : 'text-[#717171] hover:bg-white hover:text-[#1A1A1A]'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Admin Profile & Logout */}
        <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl">
                <div className="w-10 h-10 bg-[hsl(142,71%,45%)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {admin?.email?.[0].toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {admin?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-[#717171] capitalize truncate">
                    {admin?.role || 'Administrator'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-[#717171] hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 bg-[hsl(142,71%,45%)] rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-bold text-sm">
                  {admin?.email?.[0].toUpperCase() || 'A'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-[#717171] group-hover:text-red-500" />
              </button>
            </>
          )}
        </div>

        {/* System Status */}
        {!isCollapsed && (
          <div className="p-4 mx-4 mb-4 bg-white rounded-xl border-t border-gray-200">
            <h3 className="text-xs font-bold text-[#717171] mb-3">SYSTEM STATUS</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#717171]">Server</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs font-medium text-[#1A1A1A]">Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#717171]">Database</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs font-medium text-[#1A1A1A]">Connected</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed Status Indicators */}
        {isCollapsed && (
          <div className="p-4 flex flex-col items-center gap-2 border-t border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Server Online"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Database Connected"></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Bottom Navigation Component
export function AdminBottomNav() {
  const pathname = usePathname();

  const allNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/appeals', label: 'Appeals', icon: MessageSquare },
    { href: '/admin/moderation', label: 'Moderation', icon: AlertTriangle },
    { href: '/admin/security', label: 'Security', icon: Shield },
    { href: '/admin/audit', label: 'Audit', icon: FileText },
    { href: '/admin/configuration', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
      <div className="safe-area-inset-bottom">
        {/* Centered container with max width */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-around px-2 h-16">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors duration-200 relative flex-1 max-w-[80px]',
                    isActive
                      ? 'text-[hsl(142,71%,45%)]'
                      : 'text-[#717171]'
                  )}
                >
                  {/* Active indicator bar on top */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[hsl(142,71%,45%)] rounded-full" />
                  )}
                  
                  <Icon 
                    className={cn(
                      'h-5 w-5 stroke-[1.5]',
                      isActive ? 'text-[hsl(142,71%,45%)]' : 'text-[#717171]'
                    )} 
                  />
                  <span className={cn(
                    'text-[10px] font-medium leading-tight text-center',
                    isActive ? 'text-[hsl(142,71%,45%)]' : 'text-[#717171]'
                  )}>
                    {item.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#FCFBF7] flex">
      {/* Desktop Sidebar */}
      <AdminSidebar 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav />
    </div>
  );
}
