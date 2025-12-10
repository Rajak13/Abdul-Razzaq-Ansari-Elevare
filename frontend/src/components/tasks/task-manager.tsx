'use client'

import { BarChart3, Calendar, CheckSquare, LayoutGrid, List, Plus, Settings, Square } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { TaskFilters } from '@/components/tasks/task-filters'
import { TaskForm } from '@/components/tasks/task-form'
import { TaskList } from '@/components/tasks/task-list'
import { TaskCategoryManager } from '@/components/tasks/task-category-manager'
import { 
  useTasks, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  useBulkUpdateTasks,
  useBulkDeleteTasks,
  useReorderTasks
} from '@/hooks/use-tasks'
import { TaskService } from '@/services/task-service'
import type { Task, CreateTaskData, UpdateTaskData, TaskFilters as TaskFiltersType } from '@/types/task'



interface TaskManagerProps {
  className?: string
}

export function TaskManager({ className }: TaskManagerProps) {
  const [filters, setFilters] = useState<Partial<TaskFiltersType>>({
    sort_by: 'sort_order',
    sort_order: 'asc',
    page: 1,
    limit: 20,
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  // API hooks
  const { data: tasksResponse, isLoading, error } = useTasks(filters)
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const bulkUpdateMutation = useBulkUpdateTasks()
  const bulkDeleteMutation = useBulkDeleteTasks()
  const reorderTasksMutation = useReorderTasks()

  // Ensure tasks is always an array
  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []
  const pagination = tasksResponse?.pagination

  // Debug: Log current tasks and their sort order
  console.log('📋 TaskManager - Current tasks:', {
    tasksCount: tasks.length,
    filters,
    isDragEnabled: filters.sort_by === 'sort_order',
    tasks: tasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      sort_order: t.sort_order,
      created_at: t.created_at 
    }))
  })

  const handleTaskSubmit = async (data: CreateTaskData | UpdateTaskData) => {
    try {
      if (selectedTask) {
        // Edit mode
        await updateTaskMutation.mutateAsync({ id: selectedTask.id, data: data as UpdateTaskData })
        setShowEditDialog(false)
        setSelectedTask(null)
      } else {
        // Create mode
        await createTaskMutation.mutateAsync(data as CreateTaskData)
        setShowCreateDialog(false)
      }
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task)
    setShowEditDialog(true)
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleFiltersChange = useCallback((newFilters: Partial<TaskFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId])
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map(task => task.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedTasks([])
    setSelectionMode(false)
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedTasks([])
    }
  }

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return
    
    try {
      await bulkUpdateMutation.mutateAsync({
        ids: selectedTasks,
        data: { status: 'completed', completed_at: new Date().toISOString() }
      })
      setSelectedTasks([])
    } catch (error) {
      console.error('Failed to bulk complete tasks:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return
    
    try {
      await bulkDeleteMutation.mutateAsync(selectedTasks)
      setSelectedTasks([])
    } catch (error) {
      console.error('Failed to bulk delete tasks:', error)
    }
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 pb-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCategoriesDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Categories
            </Button>
            
            <Button
              variant="outline"
              onClick={toggleSelectionMode}
              className={cn(
                selectionMode && "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600"
              )}
            >
              {selectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">Select</span>
            </Button>
            
            {selectedTasks.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkComplete}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Complete ({selectedTasks.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete ({selectedTasks.length})
                </Button>
              </>
            )}
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-sm bg-card/50 rounded-xl border shadow-lg p-4">
            <TaskFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-sm bg-card/30 rounded-2xl border shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* Enhanced View Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    {(filters.search || filters.status || filters.priority || filters.category_id) && (
                      <span className="text-blue-600 ml-1">(filtered)</span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectionMode && selectedTasks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80"
                    >
                      {selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                  
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-primary' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80'}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">List</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-primary' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80'}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Grid</span>
                  </Button>
                </div>
              </div>

              {/* Enhanced Task List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading your tasks...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-600 mb-4">Failed to load tasks</p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : (
                <TaskList
                  tasks={tasks}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  selectedTasks={selectedTasks}
                  onTaskSelect={handleTaskSelect}
                  selectionMode={selectionMode}
                  viewMode={viewMode}
                  isDragEnabled={filters.sort_by === 'sort_order'}
                  onReorder={async (reorderedTasks) => {
                    console.log('🔄 TaskManager - onReorder called:', {
                      reorderedTasksCount: reorderedTasks.length,
                      taskIds: reorderedTasks.map(task => task.id),
                      currentFilters: filters
                    })
                    
                    // Persist the new order to the backend using the mutation hook
                    try {
                      const taskIds = reorderedTasks.map(task => task.id)
                      
                      console.log('📡 TaskManager - Calling reorderTasksMutation with:', taskIds)
                      
                      await reorderTasksMutation.mutateAsync(taskIds)
                      
                      console.log('✅ TaskManager - Tasks reordered successfully')
                    } catch (error) {
                      console.error('❌ TaskManager - Failed to persist task order:', error)
                      // Optionally show a toast notification here
                    }
                  }}
                  onDragStart={() => {
                    // Auto-switch to custom order if not already
                    if (filters.sort_by !== 'sort_order') {
                      handleFiltersChange({ sort_by: 'sort_order', sort_order: 'asc' })
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      
      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSubmit={handleTaskSubmit}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <TaskForm
              task={selectedTask}
              onSubmit={handleTaskSubmit}
              onCancel={() => {
                setShowEditDialog(false)
                setSelectedTask(null)
              }}
              isLoading={updateTaskMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Categories Management Dialog */}
      <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Task Categories</DialogTitle>
          </DialogHeader>
          <TaskCategoryManager />
        </DialogContent>
      </Dialog>
    </div>
  )
}