'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useNotes } from '@/hooks/use-notes'
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns'

interface ProductivityChartWidgetProps {
  className?: string
}

export function ProductivityChartWidget({ className }: ProductivityChartWidgetProps) {
  const { data: tasksResponse } = useTasks({ limit: 100 })
  const { data: notesResponse } = useNotes({ limit: 100 })

  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []
  const notes = Array.isArray(notesResponse?.notes) ? notesResponse.notes : []

  // Get last 7 days
  const endDate = new Date()
  const startDate = subDays(endDate, 6)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Calculate daily productivity
  const dailyData = days.map(day => {
    const dayStart = new Date(day.setHours(0, 0, 0, 0))
    const dayEnd = new Date(day.setHours(23, 59, 59, 999))
    
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' && 
      task.updated_at &&
      isWithinInterval(new Date(task.updated_at), { start: dayStart, end: dayEnd })
    ).length

    const createdNotes = notes.filter(note => 
      isWithinInterval(new Date(note.created_at), { start: dayStart, end: dayEnd })
    ).length

    return {
      date: format(day, 'MMM dd'),
      tasks: completedTasks,
      notes: createdNotes,
      total: completedTasks + createdNotes
    }
  })

  const maxValue = Math.max(...dailyData.map(d => d.total), 1)
  const totalThisWeek = dailyData.reduce((sum, d) => sum + d.total, 0)
  const avgPerDay = Math.round(totalThisWeek / 7 * 10) / 10

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Productivity Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalThisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{avgPerDay}</div>
              <div className="text-xs text-muted-foreground">Daily Avg</div>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-2">
            {dailyData.map((day, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-12 text-xs text-muted-foreground">
                  {day.date}
                </div>
                <div className="flex-1 flex items-center space-x-1">
                  {/* Tasks bar */}
                  <div 
                    className="bg-blue-500 h-3 rounded-sm transition-all"
                    style={{ 
                      width: `${Math.max((day.tasks / maxValue) * 100, day.tasks > 0 ? 10 : 0)}%` 
                    }}
                    title={`${day.tasks} tasks completed`}
                  />
                  {/* Notes bar */}
                  <div 
                    className="bg-green-500 h-3 rounded-sm transition-all"
                    style={{ 
                      width: `${Math.max((day.notes / maxValue) * 100, day.notes > 0 ? 10 : 0)}%` 
                    }}
                    title={`${day.notes} notes created`}
                  />
                </div>
                <div className="w-6 text-xs text-right text-muted-foreground">
                  {day.total}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-sm" />
              <span>Tasks</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <span>Notes</span>
            </div>
          </div>

          {totalThisWeek > 0 && (
            <div className="flex items-center justify-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Keep up the great work!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}