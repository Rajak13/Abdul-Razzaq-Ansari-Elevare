'use client';

import React from 'react';
import { Link, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import { 
  Home,
  CheckSquare,
  FileText,
  Users,
  File,
  Calendar,
  Search,
  User,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('common');
  const [showMore, setShowMore] = React.useState(false);

  const primaryNavigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: Home },
    { name: t('navigation.tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('navigation.notes'), href: '/notes', icon: FileText },
    { name: t('navigation.groups'), href: '/groups', icon: Users },
    { name: t('navigation.more'), href: '/more', icon: MoreHorizontal, isMore: true },
  ];

  const secondaryNavigation = [
    { name: t('navigation.files'), href: '/files', icon: File },
    { name: t('navigation.resources'), href: '/resources', icon: Calendar },
    { name: t('navigation.search'), href: '/search', icon: Search },
    { name: t('navigation.profile'), href: '/profile', icon: User },
  ];

  // Check if current path is in secondary navigation
  const isSecondaryActive = secondaryNavigation.some(item => 
    pathname === item.href || pathname.startsWith(item.href + '/')
  );

  React.useEffect(() => {
    if (isSecondaryActive) {
      setShowMore(true);
    }
  }, [isSecondaryActive]);

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMore(!showMore);
  };

  return (
    <>
      {/* Backdrop for more menu */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Secondary Navigation (More menu) */}
      <div className={cn(
        "fixed bottom-20 left-4 right-4 z-50 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl transition-all duration-300 xl:hidden",
        showMore ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none"
      )}>
        <div className="p-6">
          {/* Navigation Grid - Responsive for different screen sizes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex flex-col items-center justify-center space-y-3 p-4 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <div className={cn(
                    'p-3 rounded-full transition-colors',
                    isActive ? 'bg-primary-foreground/20' : 'bg-accent/50'
                  )}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-center">{item.name}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Quick Actions */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-2">
              {t('navigation.quickActions')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={"/tasks/new" as any}
                onClick={() => setShowMore(false)}
                className="flex items-center space-x-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 hover:scale-105"
              >
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span>{t('navigation.newTask')}</span>
              </Link>
              <Link
                href={"/notes/create" as any}
                onClick={() => setShowMore(false)}
                className="flex items-center space-x-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 hover:scale-105"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>{t('navigation.newNote')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border xl:hidden">
        <div className="safe-area-inset-bottom">
          <div className="grid grid-cols-5 h-16 md:h-18">
            {primaryNavigation.map((item) => {
              if (item.isMore) {
                return (
                  <button
                    key={item.name}
                    onClick={handleMoreClick}
                    className={cn(
                      'flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-all duration-200 relative group',
                      showMore || isSecondaryActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* Active indicator */}
                    {(showMore || isSecondaryActive) && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                    
                    <div className={cn(
                      'p-2 rounded-xl transition-all duration-200 group-hover:scale-110',
                      showMore || isSecondaryActive ? 'bg-primary/10' : 'group-hover:bg-accent/50'
                    )}>
                      <item.icon className={cn(
                        'h-5 w-5 md:h-6 md:w-6 transition-all duration-200',
                        showMore ? 'rotate-180' : '',
                        showMore || isSecondaryActive ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <span className={cn(
                      'text-xs transition-colors duration-200',
                      showMore || isSecondaryActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                    )}>
                      {t('navigation.more')}
                    </span>
                  </button>
                );
              }

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  className={cn(
                    'flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-all duration-200 relative group',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                  
                  <div className={cn(
                    'p-2 rounded-xl transition-all duration-200 group-hover:scale-110',
                    isActive ? 'bg-primary/10' : 'group-hover:bg-accent/50'
                  )}>
                    <item.icon className={cn(
                      'h-5 w-5 md:h-6 md:w-6 transition-colors duration-200',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <span className={cn(
                    'text-xs transition-colors duration-200',
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                  )}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}