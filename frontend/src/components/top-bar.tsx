'use client';

import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { Moon, Sun, ChevronDown, Settings, LogOut, Palette, User, Search } from 'lucide-react';
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
import { CompactLanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/navigation';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface TopBarProps {
  pathname: string;
}

export default function TopBar({ pathname }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const t = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine avatar color based on theme
  const avatarGradient = theme === 'light' 
    ? 'bg-[hsl(142,71%,45%)]' 
    : 'bg-[hsl(348,83%,47%)]'

  // Get breadcrumb based on pathname
  const getBreadcrumb = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    
    // Don't show breadcrumb for main pages, only for sub-pages
    if (segments.length === 1) return null;
    
    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      
      return { label, href, isLast };
    });
  };

  const breadcrumbs = getBreadcrumb(pathname);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const locale = window.location.pathname.split('/')[1] || 'en';
      window.location.href = `/${locale}/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex h-14 items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6">
        {/* Left: Breadcrumbs or Search */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto scrollbar-hide">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href as any} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-none">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          ) : (
            <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </form>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Switcher */}
          <ClientOnly>
            {/* Full switcher on large screens */}
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            {/* Compact globe button on small/medium screens */}
            <div className="lg:hidden">
              <CompactLanguageSwitcher />
            </div>
          </ClientOnly>

          {/* Theme Switcher */}
          <ClientOnly fallback={
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full" 
              disabled
            >
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 dark:text-slate-400" />
            </Button>
          }>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 dark:text-slate-400" />
                  ) : theme === 'light2' ? (
                    <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 dark:text-slate-400" />
                  ) : (
                    <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700 dark:text-slate-400" />
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
            <Button 
              variant="ghost" 
              className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-1 sm:px-2 rounded-full" 
              disabled
            >
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center overflow-hidden ${!user?.avatar_url ? avatarGradient : ''}`}>
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user?.name || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-[10px] sm:text-xs font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </Button>
          }>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  id="profile-menu"
                  variant="ghost" 
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-1 sm:px-2 rounded-full"
                >
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center overflow-hidden ${!user?.avatar_url ? avatarGradient : ''}`}>
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-[10px] sm:text-xs font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${!user?.avatar_url ? avatarGradient : ''}`}>
                      {user?.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user?.name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {t('navigation.profile')}
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      {t('navigation.settings')}
                    </DropdownMenuItem>
                  </Link>
                </div>
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem 
                    onClick={logout} 
                    className="text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('navigation.logout')}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
