import apiClient from '@/lib/api-client'
import type {
  Task,
  TaskCategory,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  TasksResponse,
  CreateCategoryData,
  UpdateCategoryData,
} from '@/types/task'

export class TaskService {
  // Task CRUD operations
  static async getTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Map frontend parameter names to backend parameter names
        const backendKey = key === 'sort_order' ? 'order' : key
        
        if (Array.isArray(value)) {
          value.forEach(v => params.append(backendKey, v))
        } else {
          params.append(backendKey, String(value))
        }
      }
    })

    const response = await apiClient.get(`/tasks?${params.toString()}`)
    const backendResponse = response.data
    
    // Transform backend response to frontend format
    return {
      data: backendResponse.tasks || [],
      pagination: {
        page: backendResponse.page || 1,
        limit: backendResponse.limit || 20,
        total: backendResponse.total || 0,
        totalPages: Math.ceil((backendResponse.total || 0) / (backendResponse.limit || 20))
      }
    }
  }

  static async getTask(id: string): Promise<Task> {
    const response = await apiClient.get(`/tasks/${id}`)
    return response.data.task || response.data
  }

  static async createTask(data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post('/tasks', data)
    return response.data.task || response.data
  }

  static async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await apiClient.put(`/tasks/${id}`, data)
    return response.data.task || response.data
  }

  static async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`)
  }

  static async bulkUpdateTasks(ids: string[], data: UpdateTaskData): Promise<Task[]> {
    const response = await apiClient.put<Task[]>('/tasks/bulk', { ids, data })
    return response.data
  }

  static async bulkDeleteTasks(ids: string[]): Promise<void> {
    await apiClient.delete('/tasks/bulk', { data: { ids } })
  }

  static async reorderTasks(taskIds: string[]): Promise<void> {
    console.log('🌐 TaskService.reorderTasks - Making API call:', {
      endpoint: '/tasks/reorder',
      taskIds,
      taskIdsCount: taskIds.length
    })
    
    try {
      const response = await apiClient.put('/tasks/reorder', { taskIds })
      console.log('✅ TaskService.reorderTasks - API response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ TaskService.reorderTasks - API error:', error)
      throw error
    }
  }

  // Task Category operations
  static async getCategories(): Promise<TaskCategory[]> {
    const response = await apiClient.get('/task-categories')
    // Handle backend response format
    return response.data.categories || response.data || []
  }

  static async getCategory(id: string): Promise<TaskCategory> {
    const response = await apiClient.get<TaskCategory>(`/task-categories/${id}`)
    return response.data
  }

  static async createCategory(data: CreateCategoryData): Promise<TaskCategory> {
    const response = await apiClient.post('/task-categories', data)
    return response.data.category || response.data
  }

  static async updateCategory(id: string, data: UpdateCategoryData): Promise<TaskCategory> {
    const response = await apiClient.put<TaskCategory>(`/task-categories/${id}`, data)
    return response.data
  }

  static async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/task-categories/${id}`)
  }

  // Statistics
  static async getTaskStats(): Promise<{
    total: number
    completed: number
    pending: number
    overdue: number
    by_priority: Record<string, number>
    by_category: Record<string, number>
  }> {
    const response = await apiClient.get('/tasks/stats')
    return response.data
  }
}