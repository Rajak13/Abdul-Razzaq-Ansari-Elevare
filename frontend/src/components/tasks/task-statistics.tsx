'use client'

import { format, isPast, isThisMonth, isThisWeek, isToday, isTomorrow } from 'date-fns'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

import type { Task } from '@/types/task'

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'pending' | 'completed'

interface TaskStatisticsProps {
  tasks: Task[]
  className?: string
}

interface TaskStats {
  total: number
  completed: number
  inProgress: number
  todo: number
  overdue: number
  dueToday: number
  dueTomorrow: number
  dueThisWeek: number
  dueThisMonth: number
  completionRate: number
  priorityBreakdown: Record<TaskPriority, number>
  statusBreakdown: Record<TaskStatus, number>
  categoryBreakdown: Record<string, number>
  weeklyProgress: Array<{ day: string; completed: number; total: number }>
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'blue',
  trend,
  className 
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  trend?: { value: number; label: string }
  className?: string
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/20',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('p-2 rounded-lg', colorClasses[color])}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {title}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold">{value}</div>
              {subtitle && (
                <div className="text-sm text-gray-500">{subtitle}</div>
              )}
              {trend && (
                <div className={cn(
                  'text-xs flex items-center gap-1',
                  trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-500'
                )}>
                  <TrendingUp className="h-3 w-3" />
                  {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressCard({ 
  title, 
  current, 
  total, 
  color = 'blue',
  className 
}: {
  title: string
  current: number
  total: number
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  className?: string
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{title}</span>
            <span className="text-sm text-gray-500">
              {current}/{total}
            </span>
          </div>
          
          <Progress 
            value={percentage} 
            className="h-2"
          />
          
          <div className="text-right">
            <span className="text-lg font-bold">{percentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TaskStatistics({ tasks, className }: TaskStatisticsProps) {
  const stats = useMemo((): TaskStats => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const inProgress = 0 // No in_progress status in current schema
    const todo = tasks.filter(t => t.status === 'pending').length
    
    const overdue = tasks.filter(t => 
      t.due_date && 
      isPast(new Date(t.due_date)) && 
      t.status !== 'completed'
    ).length
    
    const dueToday = tasks.filter(t => 
      t.due_date && isToday(new Date(t.due_date))
    ).length
    
    const dueTomorrow = tasks.filter(t => 
      t.due_date && isTomorrow(new Date(t.due_date))
    ).length
    
    const dueThisWeek = tasks.filter(t => 
      t.due_date && isThisWeek(new Date(t.due_date))
    ).length
    
    const dueThisMonth = tasks.filter(t => 
      t.due_date && isThisMonth(new Date(t.due_date))
    ).length
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    const priorityBreakdown = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<TaskPriority, number>)
    
    const statusBreakdown = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<TaskStatus, number>)
    
    const categoryBreakdown = tasks.reduce((acc, task) => {
      const categoryName = task.category?.name || 'Uncategorized'
      acc[categoryName] = (acc[categoryName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Generate weekly progress (last 7 days)
    const weeklyProgress = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      
      const dayTasks = tasks.filter(t => 
        t.due_date && 
        format(new Date(t.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      )
      
      const dayCompleted = dayTasks.filter(t => t.status === 'completed').length
      
      return {
        day: format(date, 'EEE'),
        completed: dayCompleted,
        total: dayTasks.length
      }
    })
    
    return {
      total,
      completed,
      inProgress,
      todo,
      overdue,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      dueThisMonth,
      completionRate,
      priorityBreakdown,
      statusBreakdown,
      categoryBreakdown,
      weeklyProgress
    }
  }, [tasks])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          icon={Target}
          color="blue"
        />
        
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle={`${stats.completionRate}% completion rate`}
          icon={CheckCircle2}
          color="green"
        />
        
        <StatCard
          title="Pending"
          value={stats.todo}
          icon={Clock}
          color="yellow"
        />
        
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Due Date Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Due Today"
          value={stats.dueToday}
          icon={Calendar}
          color="red"
        />
        
        <StatCard
          title="Due Tomorrow"
          value={stats.dueTomorrow}
          icon={Calendar}
          color="yellow"
        />
        
        <StatCard
          title="Due This Week"
          value={stats.dueThisWeek}
          icon={Calendar}
          color="blue"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressCard
          title="Overall Progress"
          current={stats.completed}
          total={stats.total}
          color="green"
        />
        
        <ProgressCard
          title="This Month"
          current={stats.dueThisMonth}
          total={stats.total}
          color="blue"
        />
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.priorityBreakdown).map(([priority, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                const colors = {
                  low: 'bg-green-500',
                  medium: 'bg-yellow-500',
                  high: 'bg-orange-500',
                  urgent: 'bg-red-500'
                }
                
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded', colors[priority as TaskPriority])} />
                      <span className="text-sm font-medium capitalize">{priority}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{count}</span>
                      <Badge variant="secondary" className="text-xs">
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.weeklyProgress.map((day, index) => {
                const percentage = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day.day}</span>
                      <span className="text-gray-500">
                        {day.completed}/{day.total}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(stats.categoryBreakdown).map(([category, count]) => {
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              
              return (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{count}</span>
                    <Badge variant="secondary" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}