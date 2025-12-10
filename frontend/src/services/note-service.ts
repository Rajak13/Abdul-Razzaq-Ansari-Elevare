import apiClient from '@/libs/api-client';
import { Note, NoteFolder, CreateNoteData, UpdateNoteData, CreateNoteFolderData, UpdateNoteFolderData } from '@/types/note';

export const noteService = {
  // Notes
  async getNotes(): Promise<Note[]> {
    const response = await apiClient.get('/notes');
    return response.data.notes || [];
  },

  async getNoteById(id: string): Promise<Note> {
    const response = await apiClient.get(`/notes/${id}`);
    return response.data.note;
  },

  async createNote(data: CreateNoteData): Promise<Note> {
    const response = await apiClient.post('/notes', data);
    return response.data.note;
  },

  async updateNote(id: string, data: UpdateNoteData): Promise<Note> {
    const response = await apiClient.put(`/notes/${id}`, data);
    return response.data.note;
  },

  async deleteNote(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  async autoSaveNote(id: string, content: any): Promise<void> {
    await apiClient.put(`/notes/${id}/autosave`, { content });
  },

  async searchNotes(query: string): Promise<Note[]> {
    const response = await apiClient.get(`/notes/search?q=${encodeURIComponent(query)}`);
    return response.data.notes || [];
  },

  async exportNote(id: string, format: 'html' | 'markdown' | 'pdf', includeSummary = false): Promise<Blob> {
    const response = await apiClient.post(`/notes/${id}/export`, {
      format,
      include_summary: includeSummary
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Note Folders
  async getNoteFolders(): Promise<NoteFolder[]> {
    const response = await apiClient.get('/note-folders');
    return response.data.folders || [];
  },

  async createNoteFolder(data: CreateNoteFolderData): Promise<NoteFolder> {
    const response = await apiClient.post('/note-folders', data);
    return response.data.folder;
  },

  async updateNoteFolder(id: string, data: UpdateNoteFolderData): Promise<NoteFolder> {
    const response = await apiClient.put(`/note-folders/${id}`, data);
    return response.data.folder;
  },

  async deleteNoteFolder(id: string): Promise<void> {
    await apiClient.delete(`/note-folders/${id}`);
  }
};