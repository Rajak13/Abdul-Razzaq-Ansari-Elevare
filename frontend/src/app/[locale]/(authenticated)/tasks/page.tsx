'use client'

import { useTranslations } from 'next-intl'
import ProtectedRoute from '@/components/auth/protected-route'
import { TaskManager } from '@/components/tasks'
import { usePageMetadata } from '@/hooks/use-page-metadata'

function TasksContent() {
  const t = useTranslations('tasks')
  usePageMetadata('tasks');
  
  return (
    <div className="bg-background">
      <TaskManager />
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