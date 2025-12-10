export interface TaskCategory {
  id: string
  user_id: string
  name: string
  color?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed'
  category_id?: string
  completed_at?: string
  tags?: string[]
  sort_order?: number
  created_at: string
  updated_at: string
  // Joined data
  category?: TaskCategory
}

export interface CreateTaskData {
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'pending' | 'completed'
  category_id?: string
  tags?: string[]
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  completed_at?: string
}

export interface TaskFilters {
  status?: string
  priority?: string
  category_id?: string
  search?: string
  tags?: string[]
  due_date_from?: string
  due_date_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface TasksResponse {
  data: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateCategoryData {
  name: string
  color?: string
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}