'use client'

import React from 'react'

import { format, isPast, isToday, isTomorrow } from 'date-fns'
import {
    AlertCircle,
    CheckCircle2,
    Circle,
    Pencil,
    Tag,
    Trash2,
    Calendar,
    Clock,
    AlertTriangle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { useUpdateTask } from '@/hooks/use-tasks'
import type { Task } from '@/types/task'

interface TaskDetailProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  className?: string
}

const priorityConfig: Record<string, { color: string; label: string; icon: React.ReactElement }> = {
  low: { 
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', 
    label: 'Low Priority',
    icon: <Circle className="h-5 w-5" />
  },
  medium: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', 
    label: 'Medium Priority',
    icon: <AlertCircle className="h-5 w-5" />
  },
  high: { 
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800', 
    label: 'High Priority',
    icon: <AlertTriangle className="h-5 w-5" />
  },
  urgent: { 
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', 
    label: 'Urgent Priority',
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />
  },
}

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactElement }> = {
  pending: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800', 
    label: 'Pending',
    icon: <Circle className="h-5 w-5" />
  },
  completed: { 
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', 
    label: 'Completed',
    icon: <CheckCircle2 className="h-5 w-5" />
  },
}

export function TaskDetail({ task, open, onOpenChange, onEdit, onDelete }: TaskDetailProps) {
  const updateTask = useUpdateTask()

  const handleToggleComplete = () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const updateData: any = { 
      status: newStatus 
    }
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }
    
    updateTask.mutate({ id: task.id, data: updateData })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
      onOpenChange(false)
    }
  }

  const isCompleted = task.status === 'completed'
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted

  const getDueDateInfo = () => {
    if (!task.due_date) return null

    const dueDate = new Date(task.due_date)
    
    if (isToday(dueDate)) {
      return { 
        text: `Today at ${format(dueDate, 'h:mm a')}`, 
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        icon: <Calendar className="w-4 h-4" />
      }
    } else if (isTomorrow(dueDate)) {
      return { 
        text: `Tomorrow at ${format(dueDate, 'h:mm a')}`, 
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        icon: <Calendar className="w-4 h-4" />
      }
    } else if (isPast(dueDate) && !isCompleted) {
      return { 
        text: `Overdue since ${format(dueDate, 'MMM d, yyyy')}`, 
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        icon: <AlertTriangle className="w-4 h-4" />
      }
    } else {
      return { 
        text: format(dueDate, 'MMM d, yyyy \'at\' h:mm a'), 
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        icon: <Calendar className="w-4 h-4" />
      }
    }
  }

  const dueDateInfo = getDueDateInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto hover:bg-transparent"
              onClick={handleToggleComplete}
              disabled={updateTask.isPending}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Circle className="h-6 w-6 text-gray-400 hover:text-green-600" />
              )}
            </Button>
            <span className={cn(
              'flex-1 text-left',
              isCompleted && 'line-through text-gray-500'
            )}>
              {task.title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Task
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToggleComplete}
              disabled={updateTask.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{statusConfig[task.status].icon}</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <Badge className={cn('mt-1 border', statusConfig[task.status].color)}>
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{priorityConfig[task.priority].icon}</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                    <Badge className={cn('mt-1 border', priorityConfig[task.priority].color)}>
                      {priorityConfig[task.priority].label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>📝</span>
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Due Date */}
          {dueDateInfo && (
            <Card className={cn(isOverdue && 'border-red-200 dark:border-red-800')}>
              <CardContent className="p-4">
                <div className={cn('flex items-center gap-3 p-3 rounded-lg', dueDateInfo.bgColor)}>
                  <span className="text-2xl">{dueDateInfo.icon}</span>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className={cn('font-medium', dueDateInfo.color)}>
                      {dueDateInfo.text}
                    </p>
                  </div>
                  {isOverdue && (
                    <AlertCircle className="h-5 w-5 text-red-600 ml-auto" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category */}
          {task.category && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                    style={{ backgroundColor: task.category.color || '#6b7280' }}
                  />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                    <p className="font-medium">{task.category.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Task Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Created</p>
                  <p className="font-medium">
                    {format(new Date(task.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                  <p className="font-medium">
                    {format(new Date(task.updated_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
              
              {task.completed_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Completed</p>
                    <p className="font-medium text-green-600 flex items-center gap-2">
                      <span>🎉</span>
                      {format(new Date(task.completed_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}