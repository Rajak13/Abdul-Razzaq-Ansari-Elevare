import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyGroupService } from '@/services/study-group-service';
import {
  StudyGroupQueryParams,
  CreateStudyGroupInput,
  UpdateStudyGroupInput,
  CreateMessageInput,
} from '@/types/study-group';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

// Query keys
export const studyGroupKeys = {
  all: ['study-groups'] as const,
  lists: () => [...studyGroupKeys.all, 'list'] as const,
  list: (params?: StudyGroupQueryParams) => [...studyGroupKeys.lists(), params] as const,
  details: () => [...studyGroupKeys.all, 'detail'] as const,
  detail: (id: string) => [...studyGroupKeys.details(), id] as const,
  members: (id: string) => [...studyGroupKeys.detail(id), 'members'] as const,
  joinRequests: (id: string) => [...studyGroupKeys.detail(id), 'join-requests'] as const,
  messages: (id: string, page?: number) => [...studyGroupKeys.detail(id), 'messages', page] as const,
};

// Get study groups
export function useStudyGroups(params?: StudyGroupQueryParams) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: studyGroupKeys.list(params),
    queryFn: () => studyGroupService.getStudyGroups(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated && !authLoading,
  });
}

// Get a specific study group
export function useStudyGroup(id: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: studyGroupKeys.detail(id),
    queryFn: () => studyGroupService.getStudyGroup(id),
    enabled: !!id && isAuthenticated && !authLoading,
  });
}

// Get group members
export function useGroupMembers(id: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: studyGroupKeys.members(id),
    queryFn: () => studyGroupService.getGroupMembers(id),
    enabled: !!id && isAuthenticated && !authLoading,
  });
}

// Get join requests
export function useJoinRequests(id: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: studyGroupKeys.joinRequests(id),
    queryFn: () => studyGroupService.getJoinRequests(id),
    enabled: !!id && isAuthenticated && !authLoading,
  });
}

// Get group messages
export function useGroupMessages(id: string, page = 1) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: studyGroupKeys.messages(id, page),
    queryFn: () => studyGroupService.getMessages(id, page),
    enabled: !!id && isAuthenticated && !authLoading,
  });
}

// Create study group mutation
export function useCreateStudyGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudyGroupInput) => studyGroupService.createStudyGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.lists() });
      toast.success('Study group created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create study group');
    },
  });
}

// Update study group mutation
export function useUpdateStudyGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudyGroupInput }) =>
      studyGroupService.updateStudyGroup(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.lists() });
      toast.success('Study group updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update study group');
    },
  });
}

// Delete study group mutation
export function useDeleteStudyGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studyGroupService.deleteStudyGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.lists() });
      toast.success('Study group deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete study group');
    },
  });
}

// Join group mutation
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studyGroupService.requestToJoin(id),
    onSuccess: (_, id) => {
      // Invalidate all study group queries to refresh the data
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.all });
      toast.success('Join request sent successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send join request');
    },
  });
}

// Leave group mutation
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      studyGroupService.removeMember(groupId, userId),
    onSuccess: (_, { groupId }) => {
      // Invalidate all study group queries to refresh the data
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.all });
      toast.success('Left group successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to leave group');
    },
  });
}

// Delete group mutation
export function useDeleteStudyGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studyGroupService.deleteStudyGroup(id),
    onSuccess: () => {
      // Invalidate all study group queries to refresh the data
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.all });
      toast.success('Study group deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete study group');
    },
  });
}

// Approve join request mutation
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      studyGroupService.approveJoinRequest(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.joinRequests(groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.detail(groupId) });
      toast.success('Join request approved!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to approve join request');
    },
  });
}

// Reject join request mutation
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      studyGroupService.rejectJoinRequest(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.joinRequests(groupId) });
      toast.success('Join request rejected!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reject join request');
    },
  });
}

// Remove member mutation
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      studyGroupService.removeMember(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.detail(groupId) });
      toast.success('Member removed successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove member');
    },
  });
}

// Send message mutation
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: CreateMessageInput }) =>
      studyGroupService.sendMessage(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: studyGroupKeys.messages(groupId) });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send message');
    },
  });
}