'use client'

import { BarChart3, Calendar, CheckSquare, LayoutGrid, List, Plus, Settings, Square } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

import { TaskFilters } from '@/components/tasks/task-filters'
import { TaskForm } from '@/components/tasks/task-form'
import { TaskList } from '@/components/tasks/task-list'
import { TaskCategoryManager } from '@/components/tasks/task-category-manager'
import { TaskCalendarView } from '@/components/tasks/task-calendar-view'
import { TaskDetail } from '@/components/tasks/task-detail'
import { TaskStatistics } from '@/components/tasks/task-statistics'
import { TaskBulkOperations } from '@/components/tasks/task-bulk-operations'
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
  openCreateDialog?: boolean
}

export function TaskManager({ className, openCreateDialog = false }: TaskManagerProps) {
  const t = useTranslations('tasks')
  const [filters, setFilters] = useState<Partial<TaskFiltersType>>({
    sort_by: 'sort_order',
    sort_order: 'asc',
    page: 1,
    limit: 20,
  })
  const [showCreateDialog, setShowCreateDialog] = useState(openCreateDialog)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false)
  const [showStatisticsDialog, setShowStatisticsDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
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

  const handleTaskView = (task: Task) => {
    setSelectedTask(task)
    setShowDetailDialog(true)
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

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }))
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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      switch (true) {
        case isCtrlOrCmd && event.key === 'n':
          event.preventDefault()
          setShowCreateDialog(true)
          break
          
        case isCtrlOrCmd && event.key === 'a':
          event.preventDefault()
          handleSelectAll()
          break
          
        case event.key === 'Escape':
          event.preventDefault()
          handleClearSelection()
          break
          
        case isCtrlOrCmd && event.key === 's':
          event.preventDefault()
          setShowStatisticsDialog(true)
          break
          
        case isCtrlOrCmd && event.key === 'c':
          event.preventDefault()
          setShowCategoriesDialog(true)
          break
          
        case isCtrlOrCmd && event.key === 'v':
          event.preventDefault()
          // Toggle view mode
          const modes: Array<'list' | 'grid' | 'calendar'> = ['list', 'grid', 'calendar']
          const currentIndex = modes.indexOf(viewMode)
          const nextIndex = (currentIndex + 1) % modes.length
          setViewMode(modes[nextIndex])
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, handleSelectAll, handleClearSelection])

  return (
    <div className={`p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 ${className}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:p-6 pb-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-primary text-primary-foreground shadow-lg flex-shrink-0">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {t('title')}
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              {t('noTasksDescription')}
            </p>
            {tasks.length > 0 && (
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span>{tasks.filter(t => t.status === 'completed').length} {t('status.completed').toLowerCase()}</span>
                <span>{tasks.filter(t => t.status === 'pending').length} {t('status.pending').toLowerCase()}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStatisticsDialog(true)}
              className="bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 backdrop-blur-sm border-white/20 dark:border-slate-600/30 text-sm"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              <span>{t('statistics.title')}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowCategoriesDialog(true)}
              className="bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 backdrop-blur-sm border-white/20 dark:border-slate-600/30 text-sm"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              <span>{t('categories.manage')}</span>
            </Button>
            
            <Button
              id="tour-tasks-select"
              variant="outline"
              onClick={toggleSelectionMode}
              className={cn(
                "bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 backdrop-blur-sm border-white/20 dark:border-slate-600/30 text-sm",
                selectionMode && "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-600"
              )}
            >
              {selectionMode ? <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" /> : <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />}
              <span>{t('actions.selectAll')}</span>
            </Button>
            
            <Button 
              id="tour-tasks-new"
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90 shadow-lg text-sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">{t('createNewTask')}</span>
              <span className="sm:hidden">{t('createTask')}</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/20 dark:border-slate-700/30 shadow-lg p-3 sm:p-4">
            <TaskFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/20 dark:border-slate-700/30 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6">
              {/* Enhanced View Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
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
                      {selectedTasks.length === tasks.length ? t('actions.deselectAll') : t('actions.selectAll')}
                    </Button>
                  )}
                  
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-primary' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80'}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('viewMode.list').replace(' View', '').replace(' 보기', '').replace(' दृश्य', '')}</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-primary' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80'}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('viewMode.grid').replace(' View', '').replace(' 보기', '').replace(' दृश्य', '')}</span>
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className={viewMode === 'calendar' ? 'bg-primary' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-700/50 dark:hover:bg-slate-700/80'}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{t('viewMode.calendar').replace(' View', '').replace(' 보기', '').replace(' दृश्य', '')}</span>
                  </Button>
                </div>
              </div>

              {/* Enhanced Task List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-slate-600 dark:text-slate-400">{t('messages.loading')}</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <div className="space-y-4">
                    <div className="text-red-600 text-lg font-medium">{t('messages.loadError')}</div>
                    <p className="text-slate-600 dark:text-slate-400">{t('messages.loadErrorDescription')}</p>
                    <Button onClick={() => window.location.reload()}>{t('messages.retry')}</Button>
                  </div>
                </div>
              ) : viewMode === 'calendar' ? (
                <TaskCalendarView
                  tasks={tasks}
                  onTaskClick={handleTaskView}
                />
              ) : (
                <TaskList
                  tasks={tasks}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  onView={handleTaskView}
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

              {/* Enhanced Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="pt-6 mt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                  <Pagination
                    currentPage={pagination.page || 1}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total || 0}
                    pageSize={filters.limit || 20}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
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
            <DialogTitle>{t('createNewTask')}</DialogTitle>
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
            <DialogTitle>{t('editTask')}</DialogTitle>
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

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onEdit={handleTaskEdit}
        />
      )}

      {/* Categories Management Dialog */}
      <Dialog open={showCategoriesDialog} onOpenChange={setShowCategoriesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('categories.manage')}</DialogTitle>
          </DialogHeader>
          <TaskCategoryManager />
        </DialogContent>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog open={showStatisticsDialog} onOpenChange={setShowStatisticsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('statistics.title')}</DialogTitle>
          </DialogHeader>
          <TaskStatistics tasks={tasks} />
        </DialogContent>
      </Dialog>

      {/* Bulk Operations */}
      <TaskBulkOperations
        selectedTasks={selectedTasks.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[]}
        onSelectionChange={setSelectedTasks}
        onClearSelection={handleClearSelection}
        onCreateTask={() => setShowCreateDialog(true)}
      />

      {/* Floating Action Button for Mobile */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-6 right-6 z-40 md:hidden h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}