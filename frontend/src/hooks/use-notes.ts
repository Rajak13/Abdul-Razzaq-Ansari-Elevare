import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/services/note-service';
import { Note, CreateNoteData, UpdateNoteData } from '@/types/note';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

export function useNotes(params?: { 
  folder_id?: string;
  page?: number; 
  limit?: number; 
  sort_by?: string; 
  order?: string;
}) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => noteService.getNotes(params),
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => noteService.getNoteById(id),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNoteData) => {
      console.log('🚀 useCreateNote: mutationFn called with data:', {
        title: data.title,
        contentLength: data.content?.length || 0,
        hasSummary: !!data.summary
      });
      return noteService.createNote(data);
    },
    onSuccess: (createdNote) => {
      console.log('✅ useCreateNote: onSuccess called with note:', createdNote.id);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // Remove duplicate toast - let the NoteEditor handle the success message
      console.log('🔇 useCreateNote: Skipping toast to prevent duplicates');
    },
    onError: (error) => {
      console.error('❌ useCreateNote: onError called:', error);
      toast.error('Failed to create note. Please try again.');
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteData }) => {
      console.log('🔄 useUpdateNote: mutationFn called with id:', id, 'data:', {
        title: data.title,
        contentLength: data.content?.length || 0,
        hasSummary: !!data.summary
      });
      return noteService.updateNote(id, data);
    },
    onSuccess: (updatedNote) => {
      console.log('✅ useUpdateNote: onSuccess called with note:', updatedNote.id);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.setQueryData(['notes', updatedNote.id], updatedNote);
      // Remove duplicate toast - let the NoteEditor handle the success message
      console.log('🔇 useUpdateNote: Skipping toast to prevent duplicates');
    },
    onError: (error) => {
      console.error('❌ useUpdateNote: onError called:', error);
      toast.error('Failed to update note. Please try again.');
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: noteService.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete note. Please try again.');
    },
  });
}

export function useAutoSaveNote(noteId: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef(false);

  const autoSave = useCallback(
    async (data: { content: any; title: string }) => {
      if (!noteId || isAutoSavingRef.current) return;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(async () => {
        try {
          isAutoSavingRef.current = true;
          await noteService.autoSaveNote(noteId, data.content);
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          isAutoSavingRef.current = false;
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    },
    [noteId]
  );

  return {
    autoSave,
    isAutoSaving: isAutoSavingRef.current,
  };
}

export function useSearchNotes() {
  return useMutation({
    mutationFn: noteService.searchNotes,
  });
}

export function useExportNote() {
  return useMutation({
    mutationFn: ({ id, format, includeSummary }: { 
      id: string; 
      format: 'html' | 'markdown' | 'pdf'; 
      includeSummary?: boolean 
    }) => noteService.exportNote(id, format, includeSummary),
  });
}