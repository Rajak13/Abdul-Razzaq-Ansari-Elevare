import { Request, Response } from 'express';
import { AdminModerationService } from '../services/adminModerationService';
import { sendReportSubmittedEmail } from '../services/emailService';
import pool from '../db/connection';
import adminAuditService from '../services/adminAuditService';
import logger from '../utils/logger';

const moderationService = new AdminModerationService(pool, adminAuditService);

// Rate limiting: Track reports per user (in-memory for simplicity)
const reportCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = reportCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    reportCounts.set(userId, { count: 1, resetTime: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (userLimit.count >= 5) {
    return false; // Max 5 reports per hour
  }
  
  userLimit.count++;
  return true;
}

/**
 * Report a resource
 */
export async function reportResource(req: Request, res: Response): Promise<any> {
  try {
    const userId = req.user!.userId;
    const { resourceId } = req.params;
    const { reason, description } = req.body;
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reports. Please try again later.'
      });
    }
    
    // Validate resource exists
    const resourceResult = await pool.query(
      'SELECT id, user_id FROM resources WHERE id = $1',
      [resourceId]
    );
    
    if (resourceResult.rows.length === 0) {
      return res.status(404).json({
        error: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found'
      });
    }
    
    const resource = resourceResult.rows[0];
    
    // Prevent self-reporting
    if (resource.user_id === userId) {
      return res.status(400).json({
        error: 'CANNOT_REPORT_OWN_CONTENT',
        message: 'You cannot report your own content'
      });
    }
    
    // Check for duplicate report
    const duplicateCheck = await pool.query(
      'SELECT id FROM abuse_reports WHERE reporter_id = $1 AND content_id = $2 AND content_type = $3',
      [userId, resourceId, 'resource']
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'DUPLICATE_REPORT',
        message: 'You have already reported this content'
      });
    }
    
    // Create report
    const report = await moderationService.createResourceReport(
      userId,
      resourceId,
      reason,
      description
    );
    
    // Send confirmation email
    const userResult = await pool.query(
      'SELECT email, name, preferred_language FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        await sendReportSubmittedEmail(
          user.email,
          user.name,
          'resource',
          report.id,
          user.preferred_language || 'en'
        );
      } catch (emailError) {
        logger.error('Failed to send report confirmation email', { emailError });
        // Don't fail the request if email fails
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id
    });
    
  } catch (error) {
    logger.error('Report resource error', { error });
    res.status(500).json({
      error: 'REPORT_SUBMISSION_FAILED',
      message: 'Failed to submit report'
    });
  }
}

/**
 * Report a study group
 */
export async function reportStudyGroup(req: Request, res: Response): Promise<any> {
  try {
    const userId = req.user!.userId;
    const { groupId } = req.params;
    const { reason, description } = req.body;
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reports. Please try again later.'
      });
    }
    
    // Validate group exists
    const groupResult = await pool.query(
      'SELECT id, owner_id FROM study_groups WHERE id = $1',
      [groupId]
    );
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        error: 'GROUP_NOT_FOUND',
        message: 'Study group not found'
      });
    }
    
    const group = groupResult.rows[0];
    
    // Validate user is a group member
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'NOT_GROUP_MEMBER',
        message: 'Only group members can report a study group'
      });
    }
    
    // Prevent self-reporting
    if (group.owner_id === userId) {
      return res.status(400).json({
        error: 'CANNOT_REPORT_OWN_CONTENT',
        message: 'You cannot report your own group'
      });
    }
    
    // Check for duplicate report
    const duplicateCheck = await pool.query(
      'SELECT id FROM abuse_reports WHERE reporter_id = $1 AND content_id = $2 AND content_type = $3',
      [userId, groupId, 'study_group']
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'DUPLICATE_REPORT',
        message: 'You have already reported this content'
      });
    }
    
    // Create report
    const report = await moderationService.createStudyGroupReport(
      userId,
      groupId,
      reason,
      description
    );
    
    // Send confirmation email
    const userResult = await pool.query(
      'SELECT email, name, preferred_language FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        await sendReportSubmittedEmail(
          user.email,
          user.name,
          'group',
          report.id,
          user.preferred_language || 'en'
        );
      } catch (emailError) {
        logger.error('Failed to send report confirmation email', { emailError });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id
    });
    
  } catch (error) {
    logger.error('Report study group error', { error });
    res.status(500).json({
      error: 'REPORT_SUBMISSION_FAILED',
      message: 'Failed to submit report'
    });
  }
}

/**
 * Report a group message
 */
export async function reportGroupMessage(req: Request, res: Response): Promise<any> {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { reason, description } = req.body;
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reports. Please try again later.'
      });
    }
    
    // Validate message exists and get group info
    const messageResult = await pool.query(
      'SELECT id, user_id, group_id FROM group_messages WHERE id = $1',
      [messageId]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        error: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      });
    }
    
    const message = messageResult.rows[0];
    
    // Validate user is a group member
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2',
      [userId, message.group_id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'NOT_GROUP_MEMBER',
        message: 'Only group members can report messages'
      });
    }
    
    // Prevent self-reporting
    if (message.user_id === userId) {
      return res.status(400).json({
        error: 'CANNOT_REPORT_OWN_CONTENT',
        message: 'You cannot report your own message'
      });
    }
    
    // Check for duplicate report
    const duplicateCheck = await pool.query(
      'SELECT id FROM abuse_reports WHERE reporter_id = $1 AND content_id = $2 AND content_type = $3',
      [userId, messageId, 'message']
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'DUPLICATE_REPORT',
        message: 'You have already reported this content'
      });
    }
    
    // Create report
    const report = await moderationService.createAbuseReport({
      reporter_id: userId,
      reported_user_id: message.user_id,
      content_type: 'message',
      content_id: messageId,
      reason,
      description
    });
    
    // Send confirmation email
    const userResult = await pool.query(
      'SELECT email, name, preferred_language FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        await sendReportSubmittedEmail(
          user.email,
          user.name,
          'message',
          report.id,
          user.preferred_language || 'en'
        );
      } catch (emailError) {
        logger.error('Failed to send report confirmation email', { emailError });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id
    });
    
  } catch (error) {
    logger.error('Report group message error', { error });
    res.status(500).json({
      error: 'REPORT_SUBMISSION_FAILED',
      message: 'Failed to submit report'
    });
  }
}

/**
 * Report a resource comment
 */
export async function reportResourceComment(req: Request, res: Response): Promise<any> {
  try {
    const userId = req.user!.userId;
    const { commentId } = req.params;
    const { reason, description } = req.body;
    
    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reports. Please try again later.'
      });
    }
    
    // Validate comment exists
    const commentResult = await pool.query(
      'SELECT id, user_id FROM resource_comments WHERE id = $1',
      [commentId]
    );
    
    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'COMMENT_NOT_FOUND',
        message: 'Comment not found'
      });
    }
    
    const comment = commentResult.rows[0];
    
    // Prevent self-reporting
    if (comment.user_id === userId) {
      return res.status(400).json({
        error: 'CANNOT_REPORT_OWN_CONTENT',
        message: 'You cannot report your own comment'
      });
    }
    
    // Check for duplicate report
    const duplicateCheck = await pool.query(
      'SELECT id FROM abuse_reports WHERE reporter_id = $1 AND content_id = $2 AND content_type = $3',
      [userId, commentId, 'comment']
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'DUPLICATE_REPORT',
        message: 'You have already reported this content'
      });
    }
    
    // Create report
    const report = await moderationService.createAbuseReport({
      reporter_id: userId,
      reported_user_id: comment.user_id,
      content_type: 'comment',
      content_id: commentId,
      reason,
      description
    });
    
    // Send confirmation email
    const userResult = await pool.query(
      'SELECT email, name, preferred_language FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        await sendReportSubmittedEmail(
          user.email,
          user.name,
          'comment',
          report.id,
          user.preferred_language || 'en'
        );
      } catch (emailError) {
        logger.error('Failed to send report confirmation email', { emailError });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id
    });
    
  } catch (error) {
    logger.error('Report resource comment error', { error });
    res.status(500).json({
      error: 'REPORT_SUBMISSION_FAILED',
      message: 'Failed to submit report'
    });
  }
}
