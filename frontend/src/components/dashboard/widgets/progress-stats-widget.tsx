'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, Trophy, Zap, Calendar } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useNotes } from '@/hooks/use-notes'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

interface ProgressStatsWidgetProps {
  className?: string
}

export function ProgressStatsWidget({ className }: ProgressStatsWidgetProps) {
  const { data: tasksResponse } = useTasks({ limit: 100 })
  const { data: notesResponse } = useNotes({ limit: 100 })

  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []
  const notes = Array.isArray(notesResponse?.notes) ? notesResponse.notes : []

  // Calculate weekly stats
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)

  const weeklyTasks = tasks.filter(task => 
    task.created_at && isWithinInterval(new Date(task.created_at), { start: weekStart, end: weekEnd })
  )
  
  const completedThisWeek = weeklyTasks.filter(task => task.status === 'completed').length
  const totalThisWeek = weeklyTasks.length
  const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0

  const notesThisWeek = notes.filter(note => 
    isWithinInterval(new Date(note.created_at), { start: weekStart, end: weekEnd })
  ).length

  // Calculate streaks and achievements
  const totalCompleted = tasks.filter(task => task.status === 'completed').length
  const totalNotes = notes.length

  const stats = [
    {
      title: 'Weekly Goal',
      value: completedThisWeek,
      target: 10,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completion Rate',
      value: completionRate,
      target: 100,
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      suffix: '%'
    },
    {
      title: 'Notes Created',
      value: notesThisWeek,
      target: 5,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Tasks Done',
      value: totalCompleted,
      target: null,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Trophy className="h-5 w-5 mr-2" />
          Progress Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            const progress = stat.target ? Math.min((stat.value / stat.target) * 100, 100) : 100
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`rounded-full p-1.5 ${stat.bgColor}`}>
                      <Icon className={`h-3 w-3 ${stat.color}`} />
                    </div>
                    <span className="text-sm font-medium">{stat.title}</span>
                  </div>
                  <div className="text-sm font-bold">
                    {stat.value}{stat.suffix || ''}
                    {stat.target && (
                      <span className="text-muted-foreground font-normal">
                        /{stat.target}
                      </span>
                    )}
                  </div>
                </div>
                
                {stat.target && (
                  <Progress 
                    value={progress} 
                    className="h-2"
                  />
                )}
                
                {stat.target && progress >= 100 && (
                  <div className="text-xs text-green-600 font-medium">
                    🎉 Goal achieved!
                  </div>
                )}
              </div>
            )
          })}

          {/* Motivational message */}
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="text-sm font-medium text-blue-900">
              {completionRate >= 80 
                ? "🔥 You're on fire! Keep up the excellent work!"
                : completionRate >= 60
                ? "💪 Great progress! You're doing well this week."
                : completionRate >= 40
                ? "📈 Good start! Keep pushing towards your goals."
                : "🚀 Let's get started! Every task completed counts."
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}