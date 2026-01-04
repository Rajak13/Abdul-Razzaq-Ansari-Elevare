'use client';

import { useAuth } from '@/contexts/auth-context';
import { Moon, Sun, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/notifications';
import { ClientOnly } from '@/components/ui/client-only';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-card border-b px-6 py-4 h-16 flex items-center">
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ClientOnly fallback={<Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled><Sun className="h-4 w-4" /></Button>}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </ClientOnly>

          {/* Notifications */}
          <ClientOnly>
            <NotificationBell />
          </ClientOnly>

          {/* User Profile */}
          <ClientOnly fallback={
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-3" disabled>
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">
                  {user?.name || 'User'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          }>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium">
                      {user?.name || 'User'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
