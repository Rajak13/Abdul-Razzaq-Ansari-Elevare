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
  MoreHorizontal
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More Menu */}
      {showMoreMenu && (
        <div className="fixed bottom-20 left-0 right-0 mx-4 bg-white rounded-2xl shadow-2xl z-50 lg:hidden overflow-hidden">
          <div className="p-2">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMoreMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[hsl(142,71%,45%)] text-white'
                      : 'text-[#717171] hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                  isActive
                    ? 'text-[hsl(142,71%,45%)]'
                    : 'text-[#717171]'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            );
          })}
          
          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
              moreNavItems.some(item => pathname === item.href)
                ? 'text-[hsl(142,71%,45%)]'
                : 'text-[#717171]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
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
