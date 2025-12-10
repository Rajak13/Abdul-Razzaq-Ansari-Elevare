'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, CheckCircle, Clock, Edit, MoreVertical, Trash2, GripVertical } from 'lucide-react'
import { format, isToday, isPast } from 'date-fns'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Task } from '@/types/task'

interface TaskListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  selectedTasks: string[]
  onTaskSelect: (taskId: string, selected: boolean) => void
  selectionMode: boolean
  viewMode: 'list' | 'grid'
  onReorder?: (tasks: Task[]) => void
  onDragStart?: () => void
  isDragEnabled?: boolean
}

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  selectedTasks,
  onTaskSelect,
  selectionMode,
  viewMode,
  onReorder,
  onDragStart,
  isDragEnabled = true
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
    console.log('🚀 TaskList - Drag started:', {
      activeId: event.active.id,
      isDragEnabled,
      tasksCount: tasks.length
    })
    setActiveId(event.active.id as string)
    onDragStart?.()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('🎯 TaskList - Drag ended:', {
      activeId: active.id,
      overId: over?.id,
      isDragEnabled,
      hasOnReorder: !!onReorder,
      willReorder: active.id !== over?.id && onReorder && isDragEnabled
    })

    if (active.id !== over?.id && onReorder && isDragEnabled) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id)
      const newIndex = tasks.findIndex((task) => task.id === over?.id)
      
      console.log('📊 TaskList - Reordering:', {
        activeId: active.id,
        overId: over?.id,
        oldIndex,
        newIndex,
        tasksBefore: tasks.map(t => ({ id: t.id, title: t.title, sort_order: t.sort_order }))
      })

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
      
      console.log('✅ TaskList - Calling onReorder with:', {
        reorderedTaskIds: reorderedTasks.map(t => t.id),
        reorderedTasks: reorderedTasks.map(t => ({ id: t.id, title: t.title, sort_order: t.sort_order }))
      })
      
      onReorder(reorderedTasks)
    }
    
    setActiveId(null)
  }

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate)
    if (isToday(date)) return 'Today'
    if (isPast(date)) return 'Overdue'
    return format(date, 'MMM d, yyyy')
  }

  const isDueDateOverdue = (dueDate: string) => {
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate))
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No tasks found</h3>
        <p className="text-muted-foreground">Create your first task to get started.</p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="relative">
        {!isDragEnabled && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 z-10">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💡 Switch to "Custom Order" in the sort dropdown to enable drag and drop reordering
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
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!isDragEnabled ? 'mt-16' : ''}`}>
              {tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  selectedTasks={selectedTasks}
                  onTaskSelect={onTaskSelect}
                  selectionMode={selectionMode}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                  formatDueDate={formatDueDate}
                  isDueDateOverdue={isDueDateOverdue}
                  isDragEnabled={isDragEnabled}
                />
              ))}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-75 transform rotate-2 scale-105">
                <Card className="shadow-lg">
                  <CardContent className="p-4">
                    <h3 className="font-medium">{activeTask.title}</h3>
                    <div className="flex space-x-2 mt-2">
                      <Badge variant="secondary" className={getStatusColor(activeTask.status)}>
                        {activeTask.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className={getPriorityColor(activeTask.priority)}>
                        {activeTask.priority}
                      </Badge>
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

  return (
    <div className="relative">
      {!isDragEnabled && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 z-10">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 Switch to "Custom Order" in the sort dropdown to enable drag and drop reordering
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
          <div className={`space-y-2 ${!isDragEnabled ? 'mt-16' : ''}`}>
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                selectedTasks={selectedTasks}
                onTaskSelect={onTaskSelect}
                selectionMode={selectionMode}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                formatDueDate={formatDueDate}
                isDueDateOverdue={isDueDateOverdue}
                isDragEnabled={isDragEnabled}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-75 transform rotate-1 scale-105">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <h3 className="font-medium">{activeTask.title}</h3>
                      <div className="flex space-x-2 mt-1">
                        <Badge variant="secondary" className={getStatusColor(activeTask.status)}>
                          {activeTask.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className={getPriorityColor(activeTask.priority)}>
                          {activeTask.priority}
                        </Badge>
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

// Sortable Task Item for List View
interface SortableTaskItemProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  selectedTasks: string[]
  onTaskSelect: (taskId: string, selected: boolean) => void
  selectionMode: boolean
  getPriorityColor: (priority: string) => string
  getStatusColor: (status: string) => string
  formatDueDate: (date: string) => string
  isDueDateOverdue: (date: string) => boolean
  isDragEnabled?: boolean
}

function SortableTaskItem({
  task,
  onEdit,
  onDelete,
  selectedTasks,
  onTaskSelect,
  selectionMode,
  getPriorityColor,
  getStatusColor,
  formatDueDate,
  isDueDateOverdue,
  isDragEnabled = true
}: SortableTaskItemProps) {
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

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-105 rotate-1 shadow-lg' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div
              {...(isDragEnabled ? attributes : {})}
              {...(isDragEnabled ? listeners : {})}
              className={`p-1 rounded transition-colors ${
                isDragEnabled 
                  ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50' 
                  : 'cursor-not-allowed opacity-50'
              }`}
              title={isDragEnabled ? 'Drag to reorder' : 'Switch to Custom Order to enable drag and drop'}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {selectionMode && (
              <Checkbox
                checked={selectedTasks.includes(task.id)}
                onCheckedChange={(checked) => onTaskSelect(task.id, !!checked)}
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </h3>
                <div className="flex space-x-2">
                  <Badge variant="secondary" className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  {task.category && (
                    <Badge variant="outline">{task.category.name}</Badge>
                  )}
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {task.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {task.due_date && (
                  <div className={`flex items-center ${
                    isDueDateOverdue(task.due_date) ? 'text-red-600' : ''
                  }`}>
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDueDate(task.due_date)}
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {format(new Date(task.created_at), 'MMM d')}
                </div>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// Sortable Task Card for Grid View
function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  selectedTasks,
  onTaskSelect,
  selectionMode,
  getPriorityColor,
  getStatusColor,
  formatDueDate,
  isDueDateOverdue,
  isDragEnabled = true
}: SortableTaskItemProps) {
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

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-105 rotate-2 shadow-lg' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-2">
            <div
              {...(isDragEnabled ? attributes : {})}
              {...(isDragEnabled ? listeners : {})}
              className={`p-1 rounded mt-1 transition-colors ${
                isDragEnabled 
                  ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50' 
                  : 'cursor-not-allowed opacity-50'
              }`}
              title={isDragEnabled ? 'Drag to reorder' : 'Switch to Custom Order to enable drag and drop'}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
            
            {selectionMode && (
              <Checkbox
                checked={selectedTasks.includes(task.id)}
                onCheckedChange={(checked) => onTaskSelect(task.id, !!checked)}
                className="mt-1"
              />
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1">
          <h3 className={`font-medium mb-2 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 mb-3">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className={getStatusColor(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="secondary" className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          {task.category && (
            <Badge variant="outline">{task.category.name}</Badge>
          )}
        </div>

        {task.due_date && (
          <div className={`flex items-center text-sm ${
            isDueDateOverdue(task.due_date) ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            <Calendar className="h-4 w-4 mr-1" />
            {formatDueDate(task.due_date)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}