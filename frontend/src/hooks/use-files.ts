import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/file-service';
import { FileFolder, UpdateFileData, UpdateFileFolderData } from '@/types/file';

export function useFiles(folderId?: string, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc') {
  return useQuery({
    queryKey: ['files', folderId, page, limit, sortBy, sortOrder],
    queryFn: () => fileService.getFiles(folderId, page, limit, sortBy, sortOrder),
  });
}

export function useFileById(id: string) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: () => fileService.getFileById(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name, folderId }: { file: File; name?: string; folderId?: string }) =>
      fileService.uploadFile(file, name, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileData }) =>
      fileService.updateFile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const blob = await fileService.downloadFile(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

export function useDownloadFolder() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { blob, name } = await fileService.downloadFolder(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

export function useSearchFiles(query: string, folderId?: string) {
  return useQuery({
    queryKey: ['files', 'search', query, folderId],
    queryFn: () => fileService.searchFiles(query, folderId),
    enabled: query.length > 0,
  });
}

// File Folders
export function useFileFolders() {
  return useQuery({
    queryKey: ['file-folders'],
    queryFn: fileService.getFileFolders,
  });
}

export function useCreateFileFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileService.createFileFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
    },
  });
}

export function useUpdateFileFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileFolderData }) =>
      fileService.updateFileFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
    },
  });
}

export function useDeleteFileFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileService.deleteFileFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useMoveFileFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      fileService.updateFileFolder(id, { parent_id: parentId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
    },
  });
}

// Helper function to build folder tree
export function buildFileFolderTree(folders: FileFolder[]): (FileFolder & { children: FileFolder[] })[] {
  const folderMap = new Map<string, FileFolder & { children: FileFolder[] }>();
  const rootFolders: (FileFolder & { children: FileFolder[] })[] = [];

  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  folders.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!;
    
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(folderWithChildren);
      } else {
        rootFolders.push(folderWithChildren);
      }
    } else {
      rootFolders.push(folderWithChildren);
    }
  });

  return rootFolders;
}
