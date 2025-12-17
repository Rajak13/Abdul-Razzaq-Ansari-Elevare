export type GroupRole = 'owner' | 'admin' | 'member';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_private: boolean;
  max_members?: number;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupWithMemberCount extends StudyGroup {
  member_count: number;
  is_member: boolean;
  user_role?: GroupRole;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  user_name: string;
  user_email: string;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
}

export interface CreateStudyGroupInput {
  name: string;
  description?: string;
  is_private?: boolean;
  max_members?: number;
}

export interface UpdateStudyGroupInput {
  name?: string;
  description?: string;
  is_private?: boolean;
  max_members?: number;
}

export interface StudyGroupQueryParams {
  search?: string;
  is_private?: boolean;
  member_of?: boolean;
  owned_by_me?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateMessageInput {
  content: string;
}

export interface StudyGroupsResponse {
  success: boolean;
  groups: StudyGroupWithMemberCount[];
  total: number;
  page: number;
  limit: number;
}

export interface StudyGroupResponse {
  success: boolean;
  group: StudyGroupWithMemberCount;
}

export interface GroupMembersResponse {
  success: boolean;
  members: GroupMember[];
  count: number;
}

export interface JoinRequestsResponse {
  success: boolean;
  requests: GroupJoinRequest[];
  count: number;
}

export interface MessagesResponse {
  success: boolean;
  messages: GroupMessage[];
  total: number;
  page: number;
  limit: number;
}