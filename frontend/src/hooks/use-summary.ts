import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/services/note-service';
import { Note } from '@/types/note';
import { generateContentHashSync } from '@/lib/content-hash';
import { toast } from 'sonner';

/**
 * Hook for updating note summary
 */
export function useUpdateNoteSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      noteId, 
      summary, 
      content, 
      model = 'PEGASUS' 
    }: { 
      noteId: string; 
      summary: string; 
      content: string;
      model?: string;
    }) => {
      console.log('[useUpdateNoteSummary] mutationFn called with noteId:', noteId, 'summaryLength:', summary.length);
      const contentHash = generateContentHashSync(content);
      return noteService.updateNoteSummary(noteId, {
        summary,
        summary_model: model,
        content_hash: contentHash,
      });
    },
    onSuccess: (updatedNote) => {
      console.log('[useUpdateNoteSummary] onSuccess called with note:', updatedNote.id);
      // Update the note in cache
      queryClient.setQueryData(['notes', updatedNote.id], updatedNote);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // Remove duplicate toast - let the SummaryGenerator handle the success message
      console.log('[useUpdateNoteSummary] Skipping toast to prevent duplicates');
    },
    onError: (error) => {
      console.error('[useUpdateNoteSummary] onError called:', error);
      toast.error('Failed to save summary. Please try again.');
    },
  });
}

/**
 * Hook for clearing note summary
 */
export function useClearNoteSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => noteService.clearNoteSummary(noteId),
    onSuccess: (updatedNote) => {
      // Update the note in cache
      queryClient.setQueryData(['notes', updatedNote.id], updatedNote);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Summary cleared successfully');
    },
    onError: (error) => {
      console.error('Failed to clear summary:', error);
      toast.error('Failed to clear summary. Please try again.');
    },
  });
}

/**
 * Hook for checking summary status
 */
export function useSummaryStatus(noteId: string) {
  return useQuery({
    queryKey: ['notes', noteId, 'summary-status'],
    queryFn: () => noteService.checkSummaryStatus(noteId),
    enabled: !!noteId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook for generating and saving summary
 */
export function useGenerateAndSaveSummary() {
  const updateSummary = useUpdateNoteSummary();

  return useMutation({
    mutationFn: async ({ 
      noteId, 
      content, 
      maxLength = 150, 
      minLength = 50 
    }: {
      noteId: string;
      content: string;
      maxLength?: number;
      minLength?: number;
    }) => {
      // Generate summary via API
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content.trim(),
          maxLength,
          minLength
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to generate summary');
      }

      const data = await response.json();
      
      // Save the generated summary
      const updatedNote = await updateSummary.mutateAsync({
        noteId,
        summary: data.summary,
        content,
        model: data.model || 'PEGASUS'
      });

      return {
        summary: data.summary,
        note: updatedNote,
        processingTime: data.processingTime,
        model: data.model
      };
    },
    onError: (error) => {
      console.error('Failed to generate and save summary:', error);
      toast.error('Failed to generate summary. Please try again.');
    },
  });
}

/**
 * Hook for batch summary operations
 */
export function useBatchSummaryOperations() {
  const queryClient = useQueryClient();

  const regenerateMultipleSummaries = useMutation({
    mutationFn: async (noteIds: string[]) => {
      const results = [];
      
      for (const noteId of noteIds) {
        try {
          // Get note content
          const note = queryClient.getQueryData<Note>(['notes', noteId]);
          if (!note || !note.content) continue;

          // Generate new summary
          const response = await fetch('/api/generate-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: note.content.trim(),
              maxLength: 150,
              minLength: 50
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update the note with new summary
            const updatedNote = await noteService.updateNoteSummary(noteId, {
              summary: data.summary,
              summary_model: data.model || 'PEGASUS',
              content_hash: generateContentHashSync(note.content),
            });

            results.push({ noteId, success: true, note: updatedNote });
          } else {
            results.push({ noteId, success: false, error: 'Generation failed' });
          }
        } catch (error) {
          results.push({ noteId, success: false, error: (error as Error).message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      // Update cache for successful updates
      results.forEach(result => {
        if (result.success && result.note) {
          queryClient.setQueryData(['notes', result.noteId], result.note);
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast.success(`Successfully regenerated ${successCount} summaries`);
      } else {
        toast.warning(`Regenerated ${successCount} of ${totalCount} summaries`);
      }
    },
    onError: (error) => {
      console.error('Batch summary regeneration failed:', error);
      toast.error('Failed to regenerate summaries. Please try again.');
    },
  });

  return {
    regenerateMultipleSummaries,
  };
}