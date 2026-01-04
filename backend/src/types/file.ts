export interface File {
  id: string;
  user_id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  folder_id?: string;
  is_shared: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FileFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FileShare {
  id: string;
  file_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  created_at: Date;
}

export interface FileAccessLog {
  id: string;
  file_id: string;
  user_id: string;
  action: string;
  created_at: Date;
}

export interface CreateFileRequest {
  name: string;
  folder_id?: string;
}

export interface UpdateFileRequest {
  name?: string;
  folder_id?: string;
}

export interface CreateFileFolderRequest {
  name: string;
  parent_id?: string;
}

export interface UpdateFileFolderRequest {
  name?: string;
  parent_id?: string;
}

export interface ShareFileRequest {
  user_ids: string[];
}

export interface FileSearchFilters {
  query?: string;
  folder_id?: string;
  mime_type?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}