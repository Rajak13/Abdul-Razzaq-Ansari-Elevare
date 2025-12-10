'use client'

import ProtectedRoute from '@/components/auth/protected-route'
import { TaskManager } from '@/components/tasks'

function TasksContent() {
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