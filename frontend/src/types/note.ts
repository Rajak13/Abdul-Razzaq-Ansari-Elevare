export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string; // Markdown content as string
  folder_id?: string;
  tags: string[];
  is_collaborative: boolean;
  created_at: string;
  updated_at: string;
  summary?: string;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  children?: NoteFolder[];
}

export interface CreateNoteData {
  title: string;
  content: string; // Markdown content as string
  folder_id?: string;
  tags?: string[];
  is_collaborative?: boolean;
  summary?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string; // Markdown content as string
  folder_id?: string;
  tags?: string[];
  is_collaborative?: boolean;
  summary?: string;
}

export interface CreateNoteFolderData {
  name: string;
  parent_id?: string;
  color?: string;
}

export interface UpdateNoteFolderData {
  name?: string;
  parent_id?: string;
  color?: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string; // Markdown content as string
  preview: string;
}