'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Plus } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { format, isToday, parseISO } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { Link } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface CalendarWidgetProps {
  className?: string
}

// Date-fns doesn't have a Nepali locale, so we'll use English as fallback
const localeMap: Record<string, Locale> = {
  en: enUS,
  ko: ko,
  ne: enUS // Fallback to English for Nepali
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  const t = useTranslations('dashboard.widgets.calendar')
  const tTasks = useTranslations('dashboard.widgets.tasks')
  const locale = useLocale()
  const dateLocale = localeMap[locale] || enUS
  const today = new Date()
  
  // Get tasks due today
  const { data: tasksResponse, isLoading } = useTasks({
    limit: 10,
    sort_by: 'due_date',
    sort_order: 'asc'
  })

  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []
  
  // Filter tasks due today
  const todaysTasks = tasks.filter(task => 
    task.due_date && isToday(parseISO(task.due_date))
  )

  // Get upcoming tasks (next 3 days)
  const upcomingTasks = tasks.filter(task => {
    if (!task.due_date) return false
    const taskDate = parseISO(task.due_date)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)
    return taskDate > today && taskDate <= threeDaysFromNow
  }).slice(0, 3)

  const displayTasks = todaysTasks.length > 0 ? todaysTasks : upcomingTasks

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold flex items-center">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
          <span className="truncate">{todaysTasks.length > 0 ? t('today') : t('title')}</span>
        </CardTitle>
        <Link href="/tasks">
          <Button size="sm" variant="outline" className="h-7 sm:h-8 text-xs px-2 sm:px-3 flex-shrink-0">
            <Plus className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">{t('scheduleTask')}</span>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="space-y-2 sm:space-y-3">
          <div className="text-center py-1.5 sm:py-2">
            <p className="text-xl sm:text-2xl font-bold">{today.getDate()}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {today.toLocaleDateString(locale, { 
                weekday: 'long',
                month: 'short'
              })}
            </p>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3 rounded-lg p-2">
                    <div className="h-4 w-4 bg-muted rounded animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : displayTasks.length > 0 ? (
              displayTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-2 sm:space-x-3 rounded-lg p-1.5 sm:p-2 hover:bg-muted/50 transition-colors">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm font-medium truncate ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {task.title}
                    </p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground truncate">
                      {task.due_date ? (
                        isToday(parseISO(task.due_date)) 
                          ? t('today')
                          : `Due ${format(parseISO(task.due_date), 'MMM d', { locale: dateLocale })}`
                      ) : t('noDueDate')}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-[9px] sm:text-xs px-1.5 py-0 flex-shrink-0 ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : task.priority === 'high'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    <span className="hidden sm:inline">
                      {task.priority === 'urgent' ? tTasks('priorityUrgent')
                        : task.priority === 'high' ? tTasks('priorityHigh')
                        : task.priority === 'medium' ? tTasks('priorityMedium')
                        : tTasks('priorityLow')}
                    </span>
                    <span className="sm:hidden">
                      {task.priority === 'urgent' ? 'U'
                        : task.priority === 'high' ? 'H'
                        : task.priority === 'medium' ? 'M'
                        : 'L'}
                    </span>
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {todaysTasks.length === 0 && upcomingTasks.length === 0 
                    ? t('noEvents')
                    : t('noTasksDueToday')
                  }
                </p>
                <Link href="/tasks">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-3 w-3" />
                    {t('scheduleTask')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {displayTasks.length > 0 && (
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="w-full text-[10px] sm:text-xs h-6 sm:h-7">
                {t('viewAllTasks')}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}