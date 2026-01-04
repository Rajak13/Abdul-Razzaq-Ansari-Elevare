'use client'

import { useState } from 'react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Tag,
  Trash2,
  GripVertical,
  Eye,
  AlertTriangle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useUpdateTask } from '@/hooks/use-tasks'
import type { Task } from '@/types/task'

interface TaskListProps {
  tasks: Task[]
  onEdit?: (task: Task) => void
  onView?: (task: Task) => void
  onDelete?: (taskId: string) => void
  selectedTasks?: string[]
  onTaskSelect?: (taskId: string, selected: boolean) => void
  selectionMode?: boolean
  viewMode?: 'list' | 'grid'
  onReorder?: (tasks: Task[]) => void
  onDragStart?: () => void
  isDragEnabled?: boolean
  className?: string
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', label: 'Urgent' },
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800', label: 'Pending' },
  completed: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', label: 'Completed' },
}

function TaskItem({
  task,
  onEdit,
  onView,
  onDelete,
  selected = false,
  onSelect,
  selectionMode = false,
  isDragEnabled = true,
  viewMode = 'list'
}: {
  task: Task
  onEdit?: (task: Task) => void
  onView?: (task: Task) => void
  onDelete?: (taskId: string) => void
  selected?: boolean
  onSelect?: (taskId: string, selected: boolean) => void
  selectionMode?: boolean
  isDragEnabled?: boolean
  viewMode?: 'list' | 'grid'
}) {
  const updateTask = useUpdateTask()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

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
    }
  }

  const isCompleted = task.status === 'completed'
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted

  const getDueDateDisplay = () => {
    if (!task.due_date) return null

    const dueDate = new Date(task.due_date)

    if (isToday(dueDate)) {
      return { text: 'Today', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: <Calendar className="w-4 h-4" /> }
    } else if (isTomorrow(dueDate)) {
      return { text: 'Tomorrow', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: <Calendar className="w-4 h-4" /> }
    } else if (isPast(dueDate) && !isCompleted) {
      return { text: `Overdue (${format(dueDate, 'MMM d')})`, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: <AlertTriangle className="w-4 h-4" /> }
    } else {
      return { text: format(dueDate, 'MMM d, yyyy'), color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', icon: <Calendar className="w-4 h-4" /> }
    }
  }

  const dueDateDisplay = getDueDateDisplay()

  if (viewMode === 'grid') {
    return (
      <Card 
        ref={setNodeRef} 
        style={style} 
        className={cn(
          'transition-all hover:shadow-md cursor-pointer',
          isCompleted && 'opacity-75',
          isOverdue && 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10',
          selected && 'ring-2 ring-blue-500 border-blue-300',
          isDragging && 'opacity-50 scale-105 rotate-2 shadow-lg'
        )}
      >
        <CardContent className="p-4">
          {/* Header with drag handle and actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              {isDragEnabled && (
                <div
                  {...attributes}
                  {...listeners}
                  className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              
              {selectionMode && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked: boolean | 'indeterminate') => onSelect?.(task.id, !!checked)}
                  className="mt-1"
                />
              )}

              {/* Completion Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto hover:bg-transparent"
                onClick={handleToggleComplete}
                disabled={updateTask.isPending}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400 hover:text-green-600" />
                )}
              </Button>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(task)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Task
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleToggleComplete}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Task Content */}
          <div className="space-y-3">
            <h3
              className={cn(
                'font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors',
                isCompleted && 'line-through text-gray-500'
              )}
              onClick={() => onView?.(task)}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className={cn(
                'text-sm text-gray-600 line-clamp-2',
                isCompleted && 'text-gray-400'
              )}>
                {task.description}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {/* Priority */}
              <div className="flex items-center gap-1">
                <Badge className={cn('text-xs border', priorityConfig[task.priority].color)}>
                  {priorityConfig[task.priority].label}
                </Badge>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={cn('text-xs', statusConfig[task.status].color)}>
                  {statusConfig[task.status].label}
                </Badge>
              </div>

              {/* Category */}
              {task.category && (
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: task.category.color || '#6b7280' }}
                  />
                  <Badge variant="outline" className="text-xs">
                    {task.category.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Due Date */}
            {dueDateDisplay && (
              <div className={cn('flex items-center gap-1 text-xs', dueDateDisplay.color)}>
                <span>{dueDateDisplay.icon}</span>
                <span>{dueDateDisplay.text}</span>
                {isOverdue && <AlertCircle className="h-3 w-3 ml-1" />}
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {task.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{task.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // List view
  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        'transition-all hover:shadow-md',
        isCompleted && 'opacity-75',
        isOverdue && 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10',
        selected && 'ring-2 ring-blue-500 border-blue-300',
        isDragging && 'opacity-50 scale-105 rotate-1 shadow-lg'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          {isDragEnabled && (
            <div
              {...attributes}
              {...listeners}
              className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors mt-1"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Selection Checkbox */}
          {selectionMode && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked: boolean | 'indeterminate') => onSelect?.(task.id, !!checked)}
              className="mt-1"
            />
          )}

          {/* Completion Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto hover:bg-transparent mt-1"
            onClick={handleToggleComplete}
            disabled={updateTask.isPending}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 hover:text-green-600" />
            )}
          </Button>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    'font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors',
                    isCompleted && 'line-through text-gray-500'
                  )}
                  onClick={() => onView?.(task)}
                >
                  {task.title}
                </h3>

                {task.description && (
                  <p className={cn(
                    'text-sm text-gray-600 mt-1 line-clamp-2',
                    isCompleted && 'text-gray-400'
                  )}>
                    {task.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  {/* Priority */}
                  <div className="flex items-center gap-1">
                    <Badge className={cn('text-xs border', priorityConfig[task.priority].color)}>
                      {priorityConfig[task.priority].label}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn('text-xs', statusConfig[task.status].color)}>
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>

                  {/* Category */}
                  {task.category && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: task.category.color || '#6b7280' }}
                      />
                      <span className="text-gray-600">{task.category.name}</span>
                    </div>
                  )}

                  {/* Due Date */}
                  {dueDateDisplay && (
                    <div className={cn('flex items-center gap-1', dueDateDisplay.color)}>
                      <span>{dueDateDisplay.icon}</span>
                      <span>{dueDateDisplay.text}</span>
                      {isOverdue && <AlertCircle className="h-3 w-3" />}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(task)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Task
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleToggleComplete}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TaskList({
  tasks,
  onEdit,
  onView,
  onDelete,
  selectedTasks = [],
  onTaskSelect,
  selectionMode = false,
  viewMode = 'list',
  onReorder,
  onDragStart,
  isDragEnabled = true,
  className
}: TaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    onDragStart?.()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && onReorder && isDragEnabled) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id)
      const newIndex = tasks.findIndex((task) => task.id === over?.id)
      
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
      onReorder(reorderedTasks)
    }
    
    setActiveId(null)
  }

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null

  if (tasks.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
        <p className="text-gray-600 dark:text-gray-400">Create your first task to get started with organizing your work.</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {!isDragEnabled && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 z-10">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            <span>💡</span>
            Switch to "Custom Order" in the sort dropdown to enable drag and drop reordering
          </p>
        </div>
      )}

      <DndContext
        sensors={isDragEnabled ? sensors : []}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-3',
            !isDragEnabled && 'mt-16'
          )}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEdit}
                onView={onView}
                onDelete={onDelete}
                selected={selectedTasks.includes(task.id)}
                onSelect={onTaskSelect}
                selectionMode={selectionMode}
                isDragEnabled={isDragEnabled}
                viewMode={viewMode}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-75 transform rotate-1 scale-105">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <h3 className="font-medium">{activeTask.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={cn('text-xs', statusConfig[activeTask.status].color)}>
                            {statusConfig[activeTask.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={cn('text-xs border', priorityConfig[activeTask.priority].color)}>
                            {priorityConfig[activeTask.priority].label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}