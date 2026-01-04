import { query } from '../db/connection';
import {
  StudyGroup,
  GroupJoinRequest,
  GroupMessage,
  CreateStudyGroupInput,
  UpdateStudyGroupInput,
  StudyGroupQueryParams,
  CreateMessageInput,
  StudyGroupWithMemberCount,
  GroupMemberWithUser,
  GroupJoinRequestWithUser,
  GroupMessageWithUser,
  GroupRole,
} from '../types/studyGroup';
import logger from '../utils/logger';
import { socketService } from './socketService';
import { NotificationService } from './notificationService';
import { EmailService } from './emailService';

// Initialize notification service lazily
const emailService = new EmailService();
let notificationService: NotificationService;

function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService(socketService, emailService);
  }
  return notificationService;
}

/**
 * Create a new study group
 */
export async function createStudyGroup(
  userId: string,
  groupData: CreateStudyGroupInput
): Promise<StudyGroup> {
  try {
    const { name, description, is_private = false, max_members } = groupData;

    // Create the study group
    const result = await query<StudyGroup>(
      `INSERT INTO study_groups (name, description, owner_id, is_private, max_members)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, userId, is_private, max_members || null]
    );

    const group = result.rows[0];

    // Add the creator as the owner in group_members table
    await query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [group.id, userId, 'owner']
    );

    logger.info('Study group created', { groupId: group.id, userId });
    return group;
  } catch (error) {
    logger.error('Error creating study group', { error, userId, groupData });
    throw error;
  }
}

/**
 * Get all study groups with filtering and pagination
 */
export async function getStudyGroups(
  userId: string,
  params: StudyGroupQueryParams
): Promise<{ groups: StudyGroupWithMemberCount[]; total: number; page: number; limit: number }> {
  try {
    const {
      search,
      is_private,
      member_of,
      owned_by_me,
      page = 1,
      limit = 20,
    } = params;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Base condition - filter based on request type
    if (member_of) {
      // Only show groups user is a member of
      conditions.push(`EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = sg.id AND gm.user_id = $${paramIndex})`);
      values.push(userId);
      paramIndex++;
    } else if (owned_by_me) {
      // Only show groups owned by user
      conditions.push(`sg.owner_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    }
    // For "all groups" view, show ALL groups (both public and private)
    // Users can discover private groups and request to join them

    if (search) {
      conditions.push(`(sg.name ILIKE $${paramIndex} OR sg.description ILIKE $${paramIndex + 1})`);
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      paramIndex += 2;
    }

    if (is_private !== undefined) {
      conditions.push(`sg.is_private = $${paramIndex}`);
      values.push(is_private);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM study_groups sg ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get groups with member count and user membership info
    const offset = (page - 1) * limit;
    const groupsResult = await query<StudyGroupWithMemberCount>(
      `SELECT 
         sg.*,
         COUNT(gm.id) as member_count,
         EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = sg.id AND gm2.user_id = $${paramIndex}) as is_member,
         gm3.role as user_role
       FROM study_groups sg
       LEFT JOIN group_members gm ON gm.group_id = sg.id
       LEFT JOIN group_members gm3 ON gm3.group_id = sg.id AND gm3.user_id = $${paramIndex}
       ${whereClause}
       GROUP BY sg.id, gm3.role
       ORDER BY sg.created_at DESC
       LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, userId, limit, offset]
    );

    return {
      groups: groupsResult.rows,
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error getting study groups', { error, userId, params });
    throw error;
  }
}

/**
 * Get a single study group by ID
 */
export async function getStudyGroupById(
  userId: string,
  groupId: string
): Promise<StudyGroupWithMemberCount | null> {
  try {
    const result = await query<StudyGroupWithMemberCount>(
      `SELECT 
         sg.*,
         COUNT(gm.id) as member_count,
         EXISTS (SELECT 1 FROM group_members gm2 WHERE gm2.group_id = sg.id AND gm2.user_id = $2) as is_member,
         gm3.role as user_role
       FROM study_groups sg
       LEFT JOIN group_members gm ON gm.group_id = sg.id
       LEFT JOIN group_members gm3 ON gm3.group_id = sg.id AND gm3.user_id = $2
       WHERE sg.id = $1
       GROUP BY sg.id, gm3.role`,
      [groupId, userId]
    );

    const group = result.rows[0] || null;

    // For individual group access, still restrict private groups to members only
    if (group && group.is_private && !group.is_member) {
      return null; // Don't show private group details to non-members
    }

    return group;
  } catch (error) {
    logger.error('Error getting study group by ID', { error, userId, groupId });
    throw error;
  }
}

/**
 * Update a study group (only owner can update)
 */
export async function updateStudyGroup(
  userId: string,
  groupId: string,
  updates: UpdateStudyGroupInput
): Promise<StudyGroup | null> {
  try {
    // Check if user is the owner
    const ownerCheck = await query<{ owner_id: string }>(
      'SELECT owner_id FROM study_groups WHERE id = $1',
      [groupId]
    );

    if (!ownerCheck.rows[0] || ownerCheck.rows[0].owner_id !== userId) {
      return null; // Not found or not owner
    }

    const { name, description, is_private, max_members } = updates;
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (is_private !== undefined) {
      updateFields.push(`is_private = $${paramIndex}`);
      values.push(is_private);
      paramIndex++;
    }

    if (max_members !== undefined) {
      updateFields.push(`max_members = $${paramIndex}`);
      values.push(max_members);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // No fields to update, return current group
      const result = await query<StudyGroup>('SELECT * FROM study_groups WHERE id = $1', [groupId]);
      return result.rows[0] || null;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query<StudyGroup>(
      `UPDATE study_groups 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      [...values, groupId]
    );

    logger.info('Study group updated', { groupId, userId });
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error updating study group', { error, userId, groupId, updates });
    throw error;
  }
}

/**
 * Delete a study group (only owner can delete)
 */
export async function deleteStudyGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  try {
    const result = await query(
      'DELETE FROM study_groups WHERE id = $1 AND owner_id = $2',
      [groupId, userId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      logger.info('Study group deleted', { groupId, userId });
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting study group', { error, userId, groupId });
    throw error;
  }
}

/**
 * Request to join a study group
 */
export async function requestToJoinGroup(
  userId: string,
  groupId: string
): Promise<GroupJoinRequest | null> {
  try {
    // Check if group exists (allow access to basic group info for join requests)
    const groupCheck = await query<StudyGroup>(
      'SELECT * FROM study_groups WHERE id = $1',
      [groupId]
    );

    if (!groupCheck.rows[0]) {
      return null; // Group doesn't exist
    }

    const group = groupCheck.rows[0];

    // Check if user is already a member
    const memberCheck = await query<{ id: string }>(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows[0]) {
      throw new Error('User is already a member of this group');
    }

    // Check if there's already a pending request
    const existingRequest = await query<GroupJoinRequest>(
      'SELECT * FROM group_join_requests WHERE group_id = $1 AND user_id = $2 AND status = $3',
      [groupId, userId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      throw new Error('Join request already pending');
    }

    // Create join request
    const result = await query<GroupJoinRequest>(
      `INSERT INTO group_join_requests (group_id, user_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [groupId, userId, 'pending']
    );

    const joinRequest = result.rows[0];

    // Get requester's name for the notification
    const requesterResult = await query<{ name: string }>(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );

    const requesterName = requesterResult.rows[0]?.name || 'Unknown User';

    // Send notification to group owner
    try {
      await getNotificationService().sendJoinRequestReceivedNotification(
        group.owner_id,
        groupId,
        group.name,
        requesterName
      );
    } catch (notificationError) {
      // Log error but don't fail the join request creation
      logger.error('Failed to send join request notification', { 
        error: notificationError, 
        groupId, 
        userId, 
        ownerId: group.owner_id 
      });
    }

    logger.info('Join request created', { groupId, userId });
    return joinRequest;
  } catch (error) {
    logger.error('Error creating join request', { error, userId, groupId });
    throw error;
  }
}

/**
 * Get group members
 */
export async function getGroupMembers(
  userId: string,
  groupId: string
): Promise<GroupMemberWithUser[]> {
  try {
    // Check if user has access to this group
    const group = await getStudyGroupById(userId, groupId);
    if (!group) {
      return [];
    }

    const result = await query<GroupMemberWithUser>(
      `SELECT 
         gm.*,
         u.name as user_name,
         u.email as user_email
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY 
         CASE gm.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'member' THEN 3 
         END,
         gm.joined_at ASC`,
      [groupId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting group members', { error, userId, groupId });
    throw error;
  }
}

/**
 * Get pending join requests for a group (only owner/admin can see)
 */
export async function getJoinRequests(
  userId: string,
  groupId: string
): Promise<GroupJoinRequestWithUser[]> {
  try {
    // Check if user is owner or admin
    const memberCheck = await query<{ role: GroupRole }>(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (!memberCheck.rows[0] || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return []; // Not authorized
    }

    const result = await query<GroupJoinRequestWithUser>(
      `SELECT 
         gjr.*,
         u.name as user_name,
         u.email as user_email
       FROM group_join_requests gjr
       JOIN users u ON u.id = gjr.user_id
       WHERE gjr.group_id = $1 AND gjr.status = 'pending'
       ORDER BY gjr.created_at ASC`,
      [groupId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting join requests', { error, userId, groupId });
    throw error;
  }
}

/**
 * Approve or reject a join request
 */
export async function handleJoinRequest(
  userId: string,
  groupId: string,
  requestUserId: string,
  approve: boolean
): Promise<boolean> {
  try {
    // Check if user is owner or admin
    const memberCheck = await query<{ role: GroupRole }>(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (!memberCheck.rows[0] || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return false; // Not authorized
    }

    const status = approve ? 'approved' : 'rejected';

    // Update join request status
    const updateResult = await query(
      `UPDATE group_join_requests 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $2 AND user_id = $3 AND status = 'pending'`,
      [status, groupId, requestUserId]
    );

    if ((updateResult.rowCount ?? 0) === 0) {
      return false; // No pending request found
    }

    // If approved, add user to group members
    if (approve) {
      await query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [groupId, requestUserId, 'member']
      );

      // Send approval notification to the requester
      try {
        // Get group name for the notification
        const groupResult = await query<{ name: string }>(
          'SELECT name FROM study_groups WHERE id = $1',
          [groupId]
        );

        if (groupResult.rows[0]) {
          await getNotificationService().sendJoinRequestApprovalNotification(
            requestUserId,
            groupId,
            groupResult.rows[0].name
          );
        }
      } catch (notificationError) {
        // Log error but don't fail the approval process
        logger.error('Failed to send join request approval notification', { 
          error: notificationError, 
          groupId, 
          requestUserId 
        });
      }
    }

    logger.info('Join request handled', { groupId, userId, requestUserId, approve });
    return true;
  } catch (error) {
    logger.error('Error handling join request', { error, userId, groupId, requestUserId, approve });
    throw error;
  }
}

/**
 * Remove a member from the group
 */
export async function removeMember(
  userId: string,
  groupId: string,
  memberUserId: string
): Promise<boolean> {
  try {
    // Check if user is owner or admin
    const memberCheck = await query<{ role: GroupRole }>(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (!memberCheck.rows[0] || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return false; // Not authorized
    }

    // Cannot remove the owner
    const targetMemberCheck = await query<{ role: GroupRole }>(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberUserId]
    );

    if (targetMemberCheck.rows[0]?.role === 'owner') {
      return false; // Cannot remove owner
    }

    const result = await query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberUserId]
    );

    const removed = (result.rowCount ?? 0) > 0;
    if (removed) {
      logger.info('Member removed from group', { groupId, userId, memberUserId });
    }

    return removed;
  } catch (error) {
    logger.error('Error removing member', { error, userId, groupId, memberUserId });
    throw error;
  }
}

/**
 * Send a message to the group
 */
export async function sendMessage(
  userId: string,
  groupId: string,
  messageData: CreateMessageInput
): Promise<GroupMessage | null> {
  try {
    // Check if user is a member of the group
    const memberCheck = await query<{ id: string }>(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (!memberCheck.rows[0]) {
      return null; // Not a member
    }

    const { content } = messageData;

    const result = await query<GroupMessage>(
      `INSERT INTO group_messages (group_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [groupId, userId, content]
    );

    const message = result.rows[0];

    // Get user details for the message
    const userResult = await query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );

    const messageWithUser = {
      ...message,
      user_name: userResult.rows[0]?.name || 'Unknown User'
    };

    // Broadcast message to group members via WebSocket
    if (socketService) {
      socketService.broadcastMessage(groupId, messageWithUser);
    }

    logger.info('Message sent to group', { groupId, userId, messageId: message.id });
    return message;
  } catch (error) {
    logger.error('Error sending message', { error, userId, groupId, messageData });
    throw error;
  }
}

/**
 * Get messages for a group
 */
export async function getMessages(
  userId: string,
  groupId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: GroupMessageWithUser[]; total: number; page: number; limit: number }> {
  try {
    // Check if user is a member of the group
    const memberCheck = await query<{ id: string }>(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (!memberCheck.rows[0]) {
      return { messages: [], total: 0, page, limit }; // Not a member
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM group_messages WHERE group_id = $1',
      [groupId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get messages with user info
    const offset = (page - 1) * limit;
    const messagesResult = await query<GroupMessageWithUser>(
      `SELECT 
         gm.*,
         u.name as user_name
       FROM group_messages gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    return {
      messages: messagesResult.rows.reverse(), // Reverse to show oldest first
      total,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error getting messages', { error, userId, groupId });
    throw error;
  }
}