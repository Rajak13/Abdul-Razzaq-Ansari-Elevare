'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  showHeader?: boolean
  className?: string
  user?: {
    name: string
    avatar?: string
    email?: string
  } | null
}

export function AppLayout({
  children,
  showSidebar = true,
  showHeader = true,
  className,
  user,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Content */}
        <main className={cn('flex-1 overflow-auto', className)}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Layout variants for different page types
export function DashboardLayout({
  children,
  user,
}: {
  children: React.ReactNode
  user?: { name: string; avatar?: string; email?: string } | null
}) {
  return (
    <AppLayout showSidebar={true} showHeader={true} user={user}>
      {children}
    </AppLayout>
  )
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      showSidebar={false}
      showHeader={false}
      className="flex items-center justify-center bg-muted/50"
    >
      {children}
    </AppLayout>
  )
}

export function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout showSidebar={false} showHeader={true}>
      {children}
    </AppLayout>
  )
}