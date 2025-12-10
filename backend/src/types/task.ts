export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  category_id?: string;
  tags?: string[];
  sort_order?: number;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  category_id?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  category_id?: string;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  category_id?: string;
}

export interface TaskSortOptions {
  sort_by?: 'due_date' | 'priority' | 'created_at' | 'sort_order' | 'title' | 'status' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface TaskQueryParams extends TaskFilters, TaskSortOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
}
