export interface UserFile {
  id: string;
  user_id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  folder_id?: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  children?: FileFolder[];
}

export interface CreateFileData {
  name: string;
  folder_id?: string;
}

export interface UpdateFileData {
  name?: string;
  folder_id?: string;
}

export interface CreateFileFolderData {
  name: string;
  parent_id?: string;
  color?: string;
}

export interface UpdateFileFolderData {
  name?: string;
  parent_id?: string;
  color?: string;
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

export interface FilePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilesResponse {
  files: UserFile[];
  pagination: FilePagination;
}
