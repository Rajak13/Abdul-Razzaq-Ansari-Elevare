'use client';

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/contexts/auth-context'
import TopBar from '@/components/top-bar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { usePathname } from '@/navigation'
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
      {/* Sidebar - Hidden on mobile, tablet, and iPad */}
      {showSidebar && (
        <div className="hidden xl:flex">
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

  return (
    <AppLayout showSidebar={true}>
      <div className="flex flex-col h-full">
        <TopBar pathname={pathname} />
        <div className="flex-1 overflow-auto pb-20 xl:pb-0">
          {children}
        </div>
      </div>
      <MobileNav />
      <Toaster richColors position="top-right" />
    </AppLayout>
  );
}

