'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Calendar, CheckCircle, Clock, Plus } from 'lucide-react'
import { useTasks, useUpdateTask } from '@/hooks/use-tasks'
import { format, isToday, isPast } from 'date-fns'
import { toast } from 'sonner'
import { Link } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { enUS, ko } from 'date-fns/locale'
import type { Locale } from 'date-fns'

interface TasksOverviewWidgetProps {
  className?: string
}

const localeMap: Record<string, Locale> = {
  en: enUS,
  ko: ko,
  ne: enUS // Fallback to English for Nepali
}

export function TasksOverviewWidget({ className }: TasksOverviewWidgetProps) {
  const t = useTranslations('dashboard.widgets.tasks')
  const locale = useLocale() as 'en' | 'ko' | 'ne'
  const dateLocale = localeMap[locale] || enUS

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold truncate">{t('title')}</CardTitle>
        <Link href="/tasks">
          <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs px-2 sm:px-3 flex-shrink-0">
            <Plus className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">{t('createTask')}</span>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-2">
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 mb-1 sm:mb-0 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium">{stats.completed}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{t('dueToday')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mb-1 sm:mb-0 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium">{stats.pending}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{t('dueSoon')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-2">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 mb-1 sm:mb-0 flex-shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium">{stats.overdue}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{t('overdue')}</p>
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-medium">{t('upcomingTasks')}</h4>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-6 sm:h-7 px-2">
                  {t('viewAll')}
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
                  <div key={task.id} className="flex items-center space-x-2 sm:space-x-3 rounded-lg p-1.5 sm:p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs sm:text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </p>

                      <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] sm:text-xs px-1.5 py-0 ${
                            task.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : task.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {task.priority === 'urgent' ? t('priorityUrgent')
                            : task.priority === 'high' ? t('priorityHigh')
                            : task.priority === 'medium' ? t('priorityMedium')
                            : t('priorityLow')}
                        </Badge>

                        {task.due_date && (
                          <div className="flex items-center space-x-0.5 sm:space-x-1 text-[9px] sm:text-xs text-muted-foreground">
                            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="truncate">
                              {isToday(new Date(task.due_date)) 
                                ? t('dueToday')
                                : format(new Date(task.due_date), 'MMM d', { locale: dateLocale })
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
                    <p className="text-sm text-muted-foreground mb-2">{t('noDueTasks')}</p>
                    <Link href="/tasks">
                      <Button size="sm" variant="outline">
                        <Plus className="mr-1 h-3 w-3" />
                        {t('createTask')}
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