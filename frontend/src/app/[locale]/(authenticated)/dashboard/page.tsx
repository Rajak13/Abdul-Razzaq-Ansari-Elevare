'use client'

import ProtectedRoute from '@/components/auth/protected-route'
import { Dashboard } from '@/components/dashboard'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/hooks/use-auth'
import { usePageMetadata } from '@/hooks/use-page-metadata'

function DashboardContent() {
  usePageMetadata('dashboard');
  
  return (
    <div className="bg-background">
      <Dashboard />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}