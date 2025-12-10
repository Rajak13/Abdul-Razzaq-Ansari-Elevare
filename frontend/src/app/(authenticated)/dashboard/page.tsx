'use client'

import ProtectedRoute from '@/components/auth/protected-route'
import { Dashboard } from '@/components/dashboard'
import { DashboardLayout } from '@/components/layout'
import { useAuth } from '@/hooks/use-auth'

function DashboardContent() {
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