export type GroupRole = 'owner' | 'admin' | 'member';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_private: boolean;
  max_members?: number;
  created_at: Date;
  updated_at: Date;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: Date;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: Date;
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
  member_of?: boolean; // Filter groups user is a member of
  owned_by_me?: boolean; // Filter groups owned by user
  page?: number;
  limit?: number;
}

export interface CreateMessageInput {
  content: string;
}

// Extended interfaces with user information for API responses
export interface StudyGroupWithMemberCount extends StudyGroup {
  member_count: number;
  is_member: boolean;
  user_role?: GroupRole;
}

export interface GroupMemberWithUser extends GroupMember {
  user_name: string;
  user_email: string;
}

export interface GroupJoinRequestWithUser extends GroupJoinRequest {
  user_name: string;
  user_email: string;
}

export interface GroupMessageWithUser extends GroupMessage {
  user_name: string;
}