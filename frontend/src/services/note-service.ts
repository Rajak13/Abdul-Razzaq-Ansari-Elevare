import apiClient from '@/lib/api-client';
import { Note, NoteFolder, CreateNoteData, UpdateNoteData, CreateNoteFolderData, UpdateNoteFolderData } from '@/types/note';

export const noteService = {
  // Notes
  async getNotes(params?: {
    folder_id?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: string;
  }): Promise<{
    notes: Note[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.folder_id) queryParams.append('folder_id', params.folder_id);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.order) queryParams.append('order', params.order);

    const response = await apiClient.get(`/notes?${queryParams.toString()}`);
    console.log('Notes API Response:', response.data);
    return {
      notes: response.data.notes || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 20,
      totalPages: response.data.totalPages || 0,
    };
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

  // Summary-specific operations
  async updateNoteSummary(id: string, summaryData: {
    summary: string;
    summary_model?: string;
    content_hash?: string;
  }): Promise<Note> {
    const updateData: UpdateNoteData = {
      summary: summaryData.summary,
      summary_generated_at: new Date().toISOString(),
      summary_model: summaryData.summary_model || 'PEGASUS',
      content_hash: summaryData.content_hash,
    };
    
    const response = await apiClient.put(`/notes/${id}`, updateData);
    return response.data.note;
  },

  async clearNoteSummary(id: string): Promise<Note> {
    const updateData: UpdateNoteData = {
      summary: undefined,
      summary_generated_at: undefined,
      summary_model: undefined,
      content_hash: undefined,
    };
    
    const response = await apiClient.put(`/notes/${id}`, updateData);
    return response.data.note;
  },

  async checkSummaryStatus(id: string): Promise<{
    hasOutdatedSummary: boolean;
    shouldRegenerate: boolean;
    stalnessInfo?: any;
  }> {
    const response = await apiClient.get(`/notes/${id}/summary-status`);
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