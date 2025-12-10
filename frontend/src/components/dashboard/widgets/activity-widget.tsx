'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, FileText, FolderPlus, Plus } from 'lucide-react'
import { useNotes } from '@/hooks/use-notes'
import { useTasks } from '@/hooks/use-tasks'
import { formatDistanceToNow } from 'date-fns'

interface ActivityWidgetProps {
  className?: string
}

interface ActivityItem {
  id: string
  type: 'note_created' | 'note_updated' | 'task_created' | 'task_completed' | 'folder_created'
  message: string
  time: string
  icon: any
  color: string
}

export function ActivityWidget({ className }: ActivityWidgetProps) {
  const { data: notesResponse, isLoading: notesLoading } = useNotes({
    limit: 3,
    sort_by: 'updated_at',
    order: 'desc'
  })

  const { data: tasksResponse, isLoading: tasksLoading } = useTasks({
    limit: 3,
    sort_by: 'created_at',
    sort_order: 'desc'
  })

  const notes = Array.isArray(notesResponse?.notes) ? notesResponse.notes : []
  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []

  // Combine and sort activities
  const activities: ActivityItem[] = []

  // Add recent notes
  notes.forEach(note => {
    const createdTime = new Date(note.created_at).getTime()
    const updatedTime = new Date(note.updated_at).getTime()
    const isRecentlyCreated = Math.abs(updatedTime - createdTime) < 300000 // Within 5 minutes
    
    activities.push({
      id: `note-${note.id}`,
      type: isRecentlyCreated ? 'note_created' : 'note_updated',
      message: isRecentlyCreated ? `Created note "${note.title}"` : `Updated note "${note.title}"`,
      time: formatDistanceToNow(new Date(note.updated_at), { addSuffix: true }),
      icon: FileText,
      color: 'text-blue-500'
    })
  })

  // Add recent tasks
  tasks.forEach(task => {
    if (task.status === 'completed') {
      activities.push({
        id: `task-completed-${task.id}`,
        type: 'task_completed',
        message: `Completed task "${task.title}"`,
        time: formatDistanceToNow(new Date(task.updated_at), { addSuffix: true }),
        icon: CheckCircle,
        color: 'text-green-500'
      })
    } else {
      activities.push({
        id: `task-created-${task.id}`,
        type: 'task_created',
        message: `Created task "${task.title}"`,
        time: formatDistanceToNow(new Date(task.created_at), { addSuffix: true }),
        icon: Plus,
        color: 'text-orange-500'
      })
    }
  })

  // Sort by most recent and take top 5
  const sortedActivities = activities
    .sort((a, b) => {
      // Extract the actual date from the formatted string for proper sorting
      const timeA = a.time.includes('ago') ? new Date(Date.now() - parseTimeAgo(a.time)) : new Date()
      const timeB = b.time.includes('ago') ? new Date(Date.now() - parseTimeAgo(b.time)) : new Date()
      return timeB.getTime() - timeA.getTime()
    })
    .slice(0, 5)

  const isLoading = notesLoading || tasksLoading

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedActivities.length > 0 ? (
            sortedActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <Icon className={`h-4 w-4 ${activity.color} mt-0.5 flex-shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground">Start creating notes and tasks to see activity here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to parse "X ago" format to milliseconds
function parseTimeAgo(timeStr: string): number {
  const match = timeStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/)
  if (!match) return 0

  const value = parseInt(match[1])
  const unit = match[2]

  const multipliers = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  }

  return value * (multipliers[unit as keyof typeof multipliers] || 0)
}