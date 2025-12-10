import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/services/note-service';
import { NoteFolder, CreateNoteFolderData, UpdateNoteFolderData } from '@/types/note';

export function useNoteFolders() {
  return useQuery({
    queryKey: ['note-folders'],
    queryFn: noteService.getNoteFolders,
  });
}

export function useCreateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteService.createNoteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-folders'] });
    },
  });
}

export function useUpdateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteFolderData }) =>
      noteService.updateNoteFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-folders'] });
    },
  });
}

export function useDeleteNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteService.deleteNoteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-folders'] });
    },
  });
}

export function useMoveNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      noteService.updateNoteFolder(id, { parent_id: parentId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-folders'] });
    },
  });
}

// Helper function to build folder tree
export function buildFolderTree(folders: NoteFolder[]): (NoteFolder & { children: NoteFolder[] })[] {
  const folderMap = new Map<string, NoteFolder & { children: NoteFolder[] }>();
  const rootFolders: (NoteFolder & { children: NoteFolder[] })[] = [];

  // Initialize all folders with empty children array
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Build the tree structure
  folders.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!;
    
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(folderWithChildren);
      } else {
        // Parent not found, treat as root
        rootFolders.push(folderWithChildren);
      }
    } else {
      rootFolders.push(folderWithChildren);
    }
  });

  return rootFolders;
}