'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, CheckCircle, Clock, Users, FileText } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useNotes } from '@/hooks/use-notes'

interface StatsWidgetProps {
  className?: string
}

export function StatsWidget({ className }: StatsWidgetProps) {
  const { data: tasksResponse, isLoading: tasksLoading } = useTasks({ limit: 100 })
  const { data: notesResponse, isLoading: notesLoading } = useNotes()

  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []
  const notes = Array.isArray(notesResponse) ? notesResponse : []

  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const pendingTasks = tasks.filter(task => task.status === 'pending').length
  const totalTasks = tasks.length
  const totalNotes = notes.length

  const stats = [
    {
      label: 'Tasks Completed',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-500',
      loading: tasksLoading,
    },
    {
      label: 'Tasks Pending',
      value: pendingTasks,
      icon: Clock,
      color: 'text-blue-500',
      loading: tasksLoading,
    },
    {
      label: 'Total Notes',
      value: totalNotes,
      icon: FileText,
      color: 'text-purple-500',
      loading: notesLoading,
    },
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: BarChart3,
      color: 'text-orange-500',
      loading: tasksLoading,
    },
  ]

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center space-x-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <div>
                  {stat.loading ? (
                    <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    <p className="text-lg font-bold">{stat.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}