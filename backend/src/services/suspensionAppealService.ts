import { query } from '../db/connection';
import logger from '../utils/logger';

export interface SuspensionAppeal {
  id: string;
  user_id: string;
  suspension_id: string;
  appeal_message: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  admin_response?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
  // Joined data
  user_email?: string;
  user_name?: string;
  suspension_reason?: string;
  suspension_expires_at?: Date;
}

export interface CreateAppealRequest {
  user_id: string;
  suspension_id: string;
  appeal_message: string;
}

export interface ReviewAppealRequest {
  appeal_id: string;
  admin_id: string;
  status: 'approved' | 'rejected' | 'under_review';
  admin_response: string;
}

/**
 * Create a new suspension appeal
 */
export async function createAppeal(data: CreateAppealRequest): Promise<SuspensionAppeal> {
  // Check if user already has a pending appeal for this suspension
  const existingAppeal = await query(
    `SELECT id FROM suspension_appeals 
     WHERE user_id = $1 AND suspension_id = $2 AND status = 'pending'`,
    [data.user_id, data.suspension_id]
  );

  if (existingAppeal.rows.length > 0) {
    throw new Error('You already have a pending appeal for this suspension');
  }

  const result = await query<SuspensionAppeal>(
    `INSERT INTO suspension_appeals (user_id, suspension_id, appeal_message, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [data.user_id, data.suspension_id, data.appeal_message]
  );

  logger.info('Suspension appeal created', { 
    appealId: result.rows[0].id, 
    userId: data.user_id 
  });

  return result.rows[0];
}

/**
 * Get all appeals (admin)
 */
export async function getAllAppeals(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ appeals: SuspensionAppeal[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  if (filters?.status) {
    conditions.push(`sa.status = $${++paramCount}`);
    values.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM suspension_appeals sa ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  // Get appeals with user and suspension info
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const appealsResult = await query<SuspensionAppeal>(
    `SELECT 
      sa.*,
      u.email as user_email,
      u.name as user_name,
      us.reason as suspension_reason,
      us.expires_at as suspension_expires_at
     FROM suspension_appeals sa
     JOIN users u ON sa.user_id = u.id
     JOIN user_suspensions us ON sa.suspension_id = us.id
     ${whereClause}
     ORDER BY sa.created_at DESC
     LIMIT $${++paramCount} OFFSET $${++paramCount}`,
    [...values, limit, offset]
  );

  return {
    appeals: appealsResult.rows,
    total
  };
}

/**
 * Get appeal by ID
 */
export async function getAppealById(appealId: string): Promise<SuspensionAppeal | null> {
  const result = await query<SuspensionAppeal>(
    `SELECT 
      sa.*,
      u.email as user_email,
      u.name as user_name,
      us.reason as suspension_reason,
      us.expires_at as suspension_expires_at
     FROM suspension_appeals sa
     JOIN users u ON sa.user_id = u.id
     JOIN user_suspensions us ON sa.suspension_id = us.id
     WHERE sa.id = $1`,
    [appealId]
  );

  return result.rows[0] || null;
}

/**
 * Get appeals by user ID
 */
export async function getAppealsByUserId(userId: string): Promise<SuspensionAppeal[]> {
  const result = await query<SuspensionAppeal>(
    `SELECT 
      sa.*,
      us.reason as suspension_reason,
      us.expires_at as suspension_expires_at
     FROM suspension_appeals sa
     JOIN user_suspensions us ON sa.suspension_id = us.id
     WHERE sa.user_id = $1
     ORDER BY sa.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Review an appeal (admin)
 */
export async function reviewAppeal(data: ReviewAppealRequest): Promise<SuspensionAppeal> {
  const result = await query<SuspensionAppeal>(
    `UPDATE suspension_appeals
     SET status = $1,
         admin_response = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [data.status, data.admin_response, data.admin_id, data.appeal_id]
  );

  if (result.rows.length === 0) {
    throw new Error('Appeal not found');
  }

  // If appeal is approved, lift the suspension
  if (data.status === 'approved') {
    const appeal = result.rows[0];
    await query(
      `UPDATE user_suspensions
       SET is_active = FALSE,
           lifted_by = $1,
           lifted_at = CURRENT_TIMESTAMP,
           lift_reason = 'Appeal approved'
       WHERE id = $2`,
      [data.admin_id, appeal.suspension_id]
    );

    logger.info('Suspension lifted due to approved appeal', {
      appealId: data.appeal_id,
      suspensionId: appeal.suspension_id,
      adminId: data.admin_id
    });
  }

  logger.info('Suspension appeal reviewed', {
    appealId: data.appeal_id,
    status: data.status,
    adminId: data.admin_id
  });

  return result.rows[0];
}

/**
 * Get appeal statistics
 */
export async function getAppealStatistics(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
}> {
  const result = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE status = 'under_review') as under_review
     FROM suspension_appeals`
  );

  const stats = result.rows[0];
  return {
    total: parseInt(stats.total),
    pending: parseInt(stats.pending),
    approved: parseInt(stats.approved),
    rejected: parseInt(stats.rejected),
    under_review: parseInt(stats.under_review)
  };
}
