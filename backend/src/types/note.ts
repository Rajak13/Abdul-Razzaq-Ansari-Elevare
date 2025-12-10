export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string; // Now stores markdown content as string
  folder_id?: string;
  tags: string[];
  is_collaborative: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  color?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNoteInput {
  title: string;
  content: string; // Markdown content as string
  folder_id?: string;
  tags?: string[];
  is_collaborative?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string; // Markdown content as string
  folder_id?: string | null;
  tags?: string[];
  is_collaborative?: boolean;
}

export interface CreateNoteFolderInput {
  name: string;
  parent_id?: string;
  color?: string;
}

export interface UpdateNoteFolderInput {
  name?: string;
  parent_id?: string;
  color?: string;
}

export interface NoteFilters {
  folder_id?: string;
  tags?: string[];
  is_collaborative?: boolean;
}

export interface NoteSortOptions {
  sort_by?: 'title' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface NoteQueryParams extends NoteFilters, NoteSortOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExportOptions {
  format: 'pdf' | 'markdown' | 'html';
  include_summary?: boolean;
}

export interface SummaryOptions {
  length?: 'short' | 'medium' | 'detailed';
}