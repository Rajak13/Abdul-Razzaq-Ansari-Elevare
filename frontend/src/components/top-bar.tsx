'use client';

import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { Moon, Sun, ChevronDown, Settings, LogOut, Palette } from 'lucide-react';
import { useTheme } from './theme-provider';
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
import { LanguageSwitcher } from '@/components/language-switcher';

interface TopBarProps {
  pathname: string;
}

export default function TopBar({ pathname }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');

  // Get page title based on pathname
  const getPageInfo = (path: string) => {
    switch (path) {
      case '/dashboard':
        return { title: t('navigation.dashboard'), subtitle: t('metadata.dashboard.description') }
      case '/tasks':
        return { title: t('navigation.tasks'), subtitle: t('metadata.tasks.description') }
      case '/notes':
        return { title: t('navigation.notes'), subtitle: t('metadata.notes.description') }
      case '/groups':
        return { title: t('navigation.groups'), subtitle: t('metadata.groups.description') }
      case '/files':
        return { title: t('navigation.files'), subtitle: t('metadata.files.description') }
      case '/resources':
        return { title: t('navigation.resources'), subtitle: t('metadata.resources.description') }
      case '/search':
        return { title: t('navigation.search'), subtitle: t('metadata.search.description') }
      case '/profile':
        return { title: t('navigation.profile'), subtitle: t('metadata.profile.description') }
      default:
        return { title: t('metadata.siteName'), subtitle: t('metadata.siteDescription') }
    }
  }

  const { title, subtitle } = getPageInfo(pathname);

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
          {/* Language Switcher */}
          <ClientOnly>
            <LanguageSwitcher />
          </ClientOnly>

          {/* Theme Switcher */}
          <ClientOnly fallback={<Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled><Palette className="h-4 w-4" /></Button>}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : theme === 'light2' ? (
                    <Palette className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className={theme === 'light' ? 'bg-accent' : ''}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  {t('theme.light')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('light2')}
                  className={theme === 'light2' ? 'bg-accent' : ''}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {t('theme.light2')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className={theme === 'dark' ? 'bg-accent' : ''}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  {t('theme.dark')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {t('navigation.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('navigation.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
