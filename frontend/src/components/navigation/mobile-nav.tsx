'use client';

import React from 'react';
import { Link, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import { 
  Home,
  CheckSquare,
  FileText,
  Users,
  User,
  Search,
  File,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('common');

  const allNavigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: Home },
    { name: t('navigation.tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('navigation.notes'), href: '/notes', icon: FileText },
    { name: t('navigation.files'), href: '/files', icon: File },
    { name: t('navigation.resources'), href: '/resources', icon: Calendar },
    { name: t('navigation.groups'), href: '/groups', icon: Users },
    { name: t('navigation.search'), href: '/search', icon: Search },
    { name: t('navigation.profile'), href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border xl:hidden">
      <div className="safe-area-inset-bottom">
        {/* Centered container with max width */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-around px-2 h-16">
            {allNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors duration-200 relative flex-1 max-w-[80px]',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {/* Active indicator bar on top */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                  
                  <item.icon 
                    className={cn(
                      'h-5 w-5 stroke-[1.5]',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )} 
                  />
                  <span className={cn(
                    'text-[10px] font-medium leading-tight text-center',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}