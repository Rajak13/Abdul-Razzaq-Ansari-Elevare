'use client';

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/contexts/auth-context'
import TopBar from '@/components/top-bar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  className?: string
}

function AppLayout({
  children,
  showSidebar = true,
  className,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const { user } = useAuth()

  const layoutUser = user
    ? {
        name: user.name || user.email || 'User',
        email: user.email,
      }
    : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Hidden on mobile and tablet */}
      {showSidebar && (
        <div className="hidden lg:flex">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            user={layoutUser}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  
  // Get page title based on pathname
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of your academic progress' }
      case '/tasks':
        return { title: 'Tasks', subtitle: 'Organize and track your academic tasks and assignments' }
      case '/notes':
        return { title: 'Notes', subtitle: 'Create and manage your study notes' }
      case '/groups':
        return { title: 'Study Groups', subtitle: 'Collaborate with peers and join study communities' }
      case '/files':
        return { title: 'Files', subtitle: 'Manage your study materials and documents' }
      case '/resources':
        return { title: 'Resources', subtitle: 'Discover and share educational resources' }
      case '/search':
        return { title: 'Search', subtitle: 'Find content across your study materials' }
      case '/profile':
        return { title: 'Profile', subtitle: 'Manage your account settings' }
      default:
        return { title: 'Elevare', subtitle: 'Your academic companion' }
    }
  }

  const { title, subtitle } = getPageTitle(pathname)

  return (
    <AppLayout showSidebar={true}>
      <div className="flex flex-col h-full">
        <TopBar title={title} subtitle={subtitle} />
        <div className="flex-1 overflow-auto pb-16 lg:pb-0">
          {children}
        </div>
      </div>
      <MobileNav />
      <Toaster richColors position="top-right" />
    </AppLayout>
  );
}
