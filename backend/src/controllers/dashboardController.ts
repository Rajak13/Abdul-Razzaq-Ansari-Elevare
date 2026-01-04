import { Request, Response } from 'express';
import {
  getDashboardData,
  getDashboardPreferences,
  updateDashboardPreferences,
  getProductivityAnalytics
} from '../services/dashboardService';
import logger from '../utils/logger';

/**
 * Get dashboard data for the authenticated user
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const dashboardData = await getDashboardData(userId);
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error in getDashboard controller', { error, userId: req.user?.userId });
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

/**
 * Get dashboard preferences for the authenticated user
 */
export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const preferences = await getDashboardPreferences(userId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error in getPreferences controller', { error, userId: req.user?.userId });
    res.status(500).json({ 
      error: 'Failed to fetch dashboard preferences',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

/**
 * Update dashboard preferences for the authenticated user
 */
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { widget_layout } = req.body;

    if (!widget_layout || typeof widget_layout !== 'object') {
      res.status(400).json({ error: 'Invalid widget_layout provided' });
      return;
    }

    const preferences = await updateDashboardPreferences(userId, widget_layout);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error in updatePreferences controller', { error, userId: req.user?.userId });
    res.status(500).json({ 
      error: 'Failed to update dashboard preferences',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

/**
 * Get productivity analytics for the authenticated user
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const analytics = await getProductivityAnalytics(userId);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error in getAnalytics controller', { error, userId: req.user?.userId });
    res.status(500).json({ 
      error: 'Failed to fetch productivity analytics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}