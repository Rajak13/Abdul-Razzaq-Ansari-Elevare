'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Calendar, CheckCircle, Clock, Plus } from 'lucide-react'
import { useTasks, useUpdateTask } from '@/hooks/use-tasks'
import { format, isToday, isPast } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

interface TasksOverviewWidgetProps {
  className?: string
}

export function TasksOverviewWidget({ className }: TasksOverviewWidgetProps) {
  // Use real task data
  const { data: tasksResponse, isLoading } = useTasks({
    limit: 5,
    sort_by: 'created_at',
    sort_order: 'desc'
  })

  const updateTask = useUpdateTask()

  // Ensure tasks is always an array
  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      await updateTask.mutateAsync({
        id: taskId,
        data: { status: newStatus }
      })
      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 'reopened'}`)
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const stats = {
    completed: tasks.filter(task => task.status === 'completed').length,
    pending: tasks.filter(task => task.status === 'pending').length,
    overdue: tasks.filter(task => 
      task.due_date && 
      task.status === 'pending' && 
      isPast(new Date(task.due_date)) && 
      !isToday(new Date(task.due_date))
    ).length,
  }

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Tasks Overview</CardTitle>
        <Link href="/tasks">
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="mr-1 h-3 w-3" />
            Add Task
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recent Tasks</h4>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 rounded-lg p-2">
                    <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center space-x-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </p>

                      <div className="mt-1 flex items-center space-x-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            task.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : task.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {task.priority}
                        </Badge>

                        {task.due_date && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {isToday(new Date(task.due_date)) 
                                ? 'Today' 
                                : format(new Date(task.due_date), 'MMM d')
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">No tasks yet</p>
                    <Link href="/tasks">
                      <Button size="sm" variant="outline">
                        <Plus className="mr-1 h-3 w-3" />
                        Create your first task
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}