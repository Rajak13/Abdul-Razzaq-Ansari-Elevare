'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/protected-route'
import { TaskManager } from '@/components/tasks'
import { usePageMetadata } from '@/hooks/use-page-metadata'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

function TasksContent() {
  const t = useTranslations('tasks')
  usePageMetadata('tasks');
  const searchParams = useSearchParams()
  const openNew = searchParams.get('new') === 'true'
  
  return (
    <div className="bg-background">
      <TaskManager openCreateDialog={openNew} />
    </div>
  )
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  )
}