'use client';

import { cn } from '@/lib/utils'
import * as React from 'react'
import { useAuth } from '@/contexts/auth-context'
import TopBar from '@/components/top-bar'
import { usePathname } from '@/navigation'
import { Toaster } from 'sonner'

// Lazy load heavy components
const Sidebar = React.lazy(() => import('@/components/sidebar').then(mod => ({ default: mod.Sidebar })))
const MobileNav = React.lazy(() => import('@/components/navigation/mobile-nav').then(mod => ({ default: mod.MobileNav })))

// Disable static generation for authenticated routes
export const dynamic = 'force-dynamic'

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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const layoutUser = user
    ? {
      name: user.name || user.email || 'User',
      email: user.email,
    }
    : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Hidden on mobile, tablet, and iPad */}
      {showSidebar && mounted && (
        <div className="hidden xl:flex">
          <React.Suspense fallback={<div className="w-64 border-r bg-background" />}>
            <Sidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              user={layoutUser}
            />
          </React.Suspense>
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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <AppLayout showSidebar={true}>
      <div className="flex flex-col h-full">
        <TopBar pathname={pathname} />
        <div className="flex-1 overflow-auto pb-20 xl:pb-0">
          {children}
        </div>
      </div>
      {mounted && (
        <React.Suspense fallback={null}>
          <MobileNav />
        </React.Suspense>
      )}
      <Toaster richColors position="top-right" />
    </AppLayout>
  );
}

