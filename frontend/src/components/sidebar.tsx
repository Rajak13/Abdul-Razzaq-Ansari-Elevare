'use client';

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Link, usePathname } from '@/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  Home,
  FileText,
  CheckSquare,
  File,
  Calendar,
  Users,
  Search,
  User,
  ChevronLeft,
  LogOut,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onToggle?: () => void
  user?: {
    name: string
    avatar?: string
    email?: string
  } | null
}

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

export function Sidebar({
  className,
  isOpen = true,
  onToggle,
  user,
}: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const t = useTranslations('common')

  const navigationItems: NavItem[] = [
    {
      title: t('navigation.dashboard'),
      href: '/dashboard',
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: t('navigation.tasks'),
      href: '/tasks',
      icon: <CheckSquare className="h-4 w-4" />,
    },
    {
      title: t('navigation.notes'),
      href: '/notes',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: t('navigation.groups'),
      href: '/groups',
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t('navigation.files'),
      href: '/files',
      icon: <File className="h-4 w-4" />,
    },
    {
      title: t('navigation.resources'),
      href: '/resources',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: t('navigation.search'),
      href: '/search',
      icon: <Search className="h-4 w-4" />,
    },
    {
      title: t('navigation.profile'),
      href: '/profile',
      icon: <User className="h-4 w-4" />,
    },
  ]

  const quickActions: NavItem[] = [
    {
      title: t('navigation.newTask'),
      href: '/tasks?new=true',
      icon: <Plus className="h-4 w-4" />,
    },
    {
      title: t('navigation.newNote'),
      href: '/notes/create',
      icon: <Plus className="h-4 w-4" />,
    },
  ]

  // Get user display info
  const displayName = user?.name || 'User'
  const displayEmail = user?.email || 'user@example.com'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const handleLogout = () => {
    logout()
  }

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r bg-background transition-all duration-300',
        !isOpen && 'w-16',
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b px-4 bg-card">
        {!isOpen && (
          <Link href={"/dashboard" as any} className="flex items-center justify-center">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="Elevare Logo" className="h-6 w-6" />
            </div>
          </Link>
        )}
        {isOpen && (
          <Link href={"/dashboard" as any} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="Elevare Logo" className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Elevare</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              !isOpen && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground sidebar-nav-active'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  !isOpen && 'justify-center px-2'
                )}
                title={!isOpen ? item.title : undefined}
              >
                {item.icon}
                {isOpen && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>

        {/* Quick Actions */}
        {isOpen && (
          <div className="pt-4">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('navigation.quickActions')}
            </h3>
            <div className="space-y-1">
              {quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <Link
          href={"/profile" as any}
          className={cn(
            'flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-accent hover:text-accent-foreground',
            !isOpen && 'justify-center'
          )}
          title={!isOpen ? t('navigation.profileSettings') : undefined}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground overflow-hidden">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={displayName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>
          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {displayEmail}
              </p>
            </div>
          )}
        </Link>
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "mt-2 w-full justify-start",
            !isOpen && "justify-center px-2"
          )}
          title={!isOpen ? t('navigation.logout') : undefined}
        >
          <LogOut className="h-4 w-4" />
          {isOpen && <span className="ml-2">{t('navigation.logout')}</span>}
        </Button>
      </div>
    </aside>
  )
}

export default function SidebarWrapper() {
  const [isOpen, setIsOpen] = React.useState(true)
  const { user } = useAuth()

  const layoutUser = user
    ? {
        name: user.name || user.email || 'User',
        email: user.email,
        avatar: user.avatar_url,
      }
    : null

  return (
    <Sidebar
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      user={layoutUser}
    />
  )
}
