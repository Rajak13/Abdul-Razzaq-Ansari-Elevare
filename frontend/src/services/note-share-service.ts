import apiClient from '@/lib/api-client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface NoteShare {
  id: string;
  note_id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface SharedNoteData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  summary: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  folder_name: string | null;
  folder_color: string | null;
}

export const noteShareService = {
  /**
   * Create a share link for a note (authenticated)
   */
  async createShare(noteId: string, expiresInDays?: number): Promise<NoteShare> {
    const response = await apiClient.post(`/notes/${noteId}/share`, {
      expiresInDays,
    });
    return response.data.data;
  },

  /**
   * Get all shares for a note (authenticated)
   */
  async getNoteShares(noteId: string): Promise<NoteShare[]> {
    const response = await apiClient.get(`/notes/${noteId}/shares`);
    return response.data.data;
  },

  /**
   * Deactivate a share link (authenticated)
   */
  async deactivateShare(shareId: string): Promise<void> {
    await apiClient.patch(`/shares/${shareId}/deactivate`);
  },

  /**
   * Delete a share link (authenticated)
   */
  async deleteShare(shareId: string): Promise<void> {
    await apiClient.delete(`/shares/${shareId}`);
  },

  /**
   * Get a shared note by token (PUBLIC — no auth required)
   */
  async getSharedNote(token: string): Promise<SharedNoteData> {
    // Use a plain axios call so no auth header is attached
    const response = await axios.get(`${API_URL}/api/shared/${token}`);
    return response.data.data;
  },

  /**
   * Build the full public share URL for a token
   */
  buildShareUrl(token: string): string {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/shared/${token}`;
  },
};
