import apiClient from '@/lib/api-client';
import {
  UserFile,
  FileFolder,
  CreateFileFolderData,
  UpdateFileFolderData,
  UpdateFileData,
  FilesResponse,
} from '@/types/file';

export const fileService = {
  // Files
  async getFiles(
    folderId?: string,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  ): Promise<FilesResponse> {
    const params = new URLSearchParams();
    if (folderId) params.append('folder_id', folderId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);

    const response = await apiClient.get(`/files?${params.toString()}`);
    return {
      files: response.data.files || [],
      pagination: response.data.pagination,
    };
  },

  async getFileById(id: string): Promise<UserFile> {
    const response = await apiClient.get(`/files/${id}`);
    return response.data.file;
  },

  async uploadFile(file: File, name?: string, folderId?: string): Promise<UserFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (folderId) formData.append('folder_id', folderId);

    const response = await apiClient.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.file;
  },

  async updateFile(id: string, data: UpdateFileData): Promise<UserFile> {
    const response = await apiClient.put(`/files/${id}`, data);
    return response.data.file;
  },

  async deleteFile(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },

  async downloadFile(id: string): Promise<Blob> {
    const response = await apiClient.get(`/files/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async downloadFolder(id: string): Promise<{ blob: Blob; name: string }> {
    const response = await apiClient.get(`/files/folders/${id}/download`, {
      responseType: 'blob',
    });
    // Extract filename from content-disposition header if available
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const name = match ? match[1] : 'folder.zip';
    return { blob: response.data, name };
  },

  async searchFiles(query: string, folderId?: string): Promise<UserFile[]> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (folderId) params.append('folder_id', folderId);

    const response = await apiClient.get(`/files/search?${params.toString()}`);
    return response.data.files || [];
  },

  // File Folders
  async getFileFolders(): Promise<FileFolder[]> {
    const response = await apiClient.get('/files/folders');
    return response.data.folders || [];
  },

  async getFileFolderById(id: string): Promise<FileFolder> {
    const response = await apiClient.get(`/files/folders/${id}`);
    return response.data.folder;
  },

  async createFileFolder(data: CreateFileFolderData): Promise<FileFolder> {
    const response = await apiClient.post('/files/folders', data);
    return response.data.folder;
  },

  async updateFileFolder(id: string, data: UpdateFileFolderData): Promise<FileFolder> {
    const response = await apiClient.put(`/files/folders/${id}`, data);
    return response.data.folder;
  },

  async deleteFileFolder(id: string): Promise<void> {
    await apiClient.delete(`/files/folders/${id}`);
  },
};
