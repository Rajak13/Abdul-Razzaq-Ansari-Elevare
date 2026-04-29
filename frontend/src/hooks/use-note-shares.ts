import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noteShareService } from '@/services/note-share-service';
import { toast } from 'sonner';

export function useNoteShares(noteId: string) {
  return useQuery({
    queryKey: ['note-shares', noteId],
    queryFn: () => noteShareService.getNoteShares(noteId),
    enabled: !!noteId,
  });
}

export function useCreateNoteShare(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expiresInDays?: number) =>
      noteShareService.createShare(noteId, expiresInDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
    },
    onError: () => {
      toast.error('Failed to create share link. Please try again.');
    },
  });
}

export function useDeactivateShare(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => noteShareService.deactivateShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
      toast.success('Share link deactivated.');
    },
    onError: () => {
      toast.error('Failed to deactivate share link.');
    },
  });
}

export function useDeleteShare(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => noteShareService.deleteShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
      toast.success('Share link deleted.');
    },
    onError: () => {
      toast.error('Failed to delete share link.');
    },
  });
}
