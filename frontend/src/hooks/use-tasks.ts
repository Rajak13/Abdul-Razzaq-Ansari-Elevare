import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TaskService } from '@/services/task-service'
import { toast } from 'sonner'
import type {
  Task,
  TaskCategory,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  CreateCategoryData,
  UpdateCategoryData,
} from '@/types/task'

// Task hooks
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => TaskService.getTasks(filters),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => TaskService.getTask(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateTaskData) => TaskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      toast.success('Task created successfully!')
    },
    onError: (error) => {
      toast.error('Failed to create task. Please try again.')
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => 
      TaskService.updateTask(id, data),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.id] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      // Don't show toast for status updates as they're handled in the widget
    },
    onError: (error) => {
      toast.error('Failed to update task. Please try again.')
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => TaskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      toast.success('Task deleted successfully!')
    },
    onError: (error) => {
      toast.error('Failed to delete task. Please try again.')
    },
  })
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: UpdateTaskData }) => 
      TaskService.bulkUpdateTasks(ids, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => TaskService.bulkDeleteTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

export function useReorderTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (taskIds: string[]) => TaskService.reorderTasks(taskIds),
    onSuccess: () => {
      console.log('🔄 useReorderTasks - Invalidating tasks cache')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Category hooks
export function useTaskCategories() {
  return useQuery({
    queryKey: ['task-categories'],
    queryFn: () => TaskService.getCategories(),
  })
}

export function useTaskCategory(id: string) {
  return useQuery({
    queryKey: ['task-categories', id],
    queryFn: () => TaskService.getCategory(id),
    enabled: !!id,
  })
}

export function useCreateTaskCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateCategoryData) => TaskService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] })
      toast.success('Category created successfully!')
    },
    onError: (error) => {
      toast.error('Failed to create category. Please try again.')
    },
  })
}

export function useUpdateTaskCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryData }) => 
      TaskService.updateCategory(id, data),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] })
      queryClient.invalidateQueries({ queryKey: ['task-categories', updatedCategory.id] })
    },
  })
}

export function useDeleteTaskCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => TaskService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Stats hook
export function useTaskStats() {
  return useQuery({
    queryKey: ['task-stats'],
    queryFn: () => TaskService.getTaskStats(),
  })
}