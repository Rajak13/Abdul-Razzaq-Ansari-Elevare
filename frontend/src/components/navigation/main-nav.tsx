'use client';

import React from 'react';
import { Link, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import { 
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations('common');

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('navigation.groups'), href: '/study-groups', icon: UserGroupIcon },
    { name: t('navigation.search'), href: '/search', icon: MagnifyingGlassIcon },
    { name: t('navigation.resources'), href: '/resources', icon: BookmarkIcon },
    { name: t('navigation.notes'), href: '/notes', icon: DocumentTextIcon },
    { name: t('navigation.profile'), href: '/profile', icon: UserIcon },
    { name: t('navigation.notifications'), href: '/notifications', icon: BellIcon },
    { name: t('navigation.settings'), href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Elevare
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}