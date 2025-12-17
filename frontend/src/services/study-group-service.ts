import apiClient from '@/libs/api-client';
import {
  StudyGroupsResponse,
  StudyGroupResponse,
  GroupMembersResponse,
  JoinRequestsResponse,
  MessagesResponse,
  CreateStudyGroupInput,
  UpdateStudyGroupInput,
  StudyGroupQueryParams,
  CreateMessageInput,
} from '@/types/study-group';

export const studyGroupService = {
  // Get all study groups with filtering
  async getStudyGroups(params?: StudyGroupQueryParams): Promise<StudyGroupsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.search) searchParams.append('search', params.search);
    if (params?.is_private !== undefined) searchParams.append('is_private', params.is_private.toString());
    if (params?.member_of) searchParams.append('member_of', 'true');
    if (params?.owned_by_me) searchParams.append('owned_by_me', 'true');
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const url = `/groups${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get a specific study group
  async getStudyGroup(id: string): Promise<StudyGroupResponse> {
    const response = await apiClient.get(`/groups/${id}`);
    return response.data;
  },

  // Create a new study group
  async createStudyGroup(data: CreateStudyGroupInput): Promise<StudyGroupResponse> {
    const response = await apiClient.post('/groups', data);
    return response.data;
  },

  // Update a study group
  async updateStudyGroup(id: string, data: UpdateStudyGroupInput): Promise<StudyGroupResponse> {
    const response = await apiClient.put(`/groups/${id}`, data);
    return response.data;
  },

  // Delete a study group
  async deleteStudyGroup(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/groups/${id}`);
    return response.data;
  },

  // Request to join a group
  async requestToJoin(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/groups/${id}/join`);
    return response.data;
  },

  // Get group members
  async getGroupMembers(id: string): Promise<GroupMembersResponse> {
    const response = await apiClient.get(`/groups/${id}/members`);
    return response.data;
  },

  // Get join requests (for owners/admins)
  async getJoinRequests(id: string): Promise<JoinRequestsResponse> {
    const response = await apiClient.get(`/groups/${id}/join-requests`);
    return response.data;
  },

  // Approve a join request
  async approveJoinRequest(groupId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/groups/${groupId}/approve`, { user_id: userId });
    return response.data;
  },

  // Reject a join request
  async rejectJoinRequest(groupId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/groups/${groupId}/reject`, { user_id: userId });
    return response.data;
  },

  // Remove a member from the group
  async removeMember(groupId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  // Send a message to the group
  async sendMessage(groupId: string, data: CreateMessageInput): Promise<{ success: boolean; message: any }> {
    const response = await apiClient.post(`/groups/${groupId}/messages`, data);
    return response.data;
  },

  // Get group messages
  async getMessages(groupId: string, page = 1, limit = 50): Promise<MessagesResponse> {
    const response = await apiClient.get(`/groups/${groupId}/messages?page=${page}&limit=${limit}`);
    return response.data;
  },
};