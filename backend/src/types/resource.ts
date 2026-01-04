export interface Resource {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  tags: string[];
  download_count: number;
  average_rating?: number;
  rating_count?: number;
  user_rating?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateResourceRequest {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdateResourceRequest {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ResourceRating {
  id: string;
  resource_id: string;
  user_id: string;
  rating: number;
  created_at: Date;
}

export interface ResourceComment {
  id: string;
  resource_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CreateResourceCommentRequest {
  content: string;
}

export interface ResourceSearchFilters {
  query?: string;
  tags?: string[];
  file_type?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}