import { Request, Response } from 'express';
import { ResourceService } from '../services/resourceService';
import pool from '../db/connection';
import logger from '../utils/logger';
import { CreateResourceRequest, UpdateResourceRequest, CreateResourceCommentRequest } from '../types/resource';

const resourceService = new ResourceService(pool);

export const uploadResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const resourceData: CreateResourceRequest = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : []
    };

    if (!resourceData.title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const resource = await resourceService.createResource(userId, resourceData, req.file);
    
    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource
    });
  } catch (error) {
    logger.error('Error uploading resource:', error);
    res.status(500).json({ error: 'Failed to upload resource' });
  }
};

export const getResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sort_by as string || 'created_at';
    const sortOrder = req.query.sort_order as string || 'desc';

    const result = await resourceService.getResources(page, limit, sortBy, sortOrder);
    
    res.json({
      resources: result.resources,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

export const getResourceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId; // Get userId from auth middleware if available
    
    const resource = await resourceService.getResourceById(id, userId);
    
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    res.json({ resource });
  } catch (error) {
    logger.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
};

export const updateResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData: UpdateResourceRequest = req.body;

    const resource = await resourceService.updateResource(id, userId, updateData);
    
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    res.json({
      message: 'Resource updated successfully',
      resource
    });
  } catch (error) {
    logger.error('Error updating resource:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update resource' });
    }
  }
};

export const deleteResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const success = await resourceService.deleteResource(id, userId);
    
    if (!success) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    logger.error('Error deleting resource:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete resource' });
    }
  }
};

export const searchResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = {
      query: req.query.q as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : [],
      file_type: req.query.file_type as string,
      sort_by: (req.query.sort_by as string) || 'created_at',
      sort_order: (req.query.sort_order as string) || 'desc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await resourceService.searchResources(filters);
    
    res.json({
      resources: result.resources,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error('Error searching resources:', error);
    res.status(500).json({ error: 'Failed to search resources' });
  }
};

export const downloadResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const { resource, filePath } = await resourceService.downloadResource(id);
    
    res.download(filePath, resource.file_name, (err) => {
      if (err) {
        logger.error('Error serving file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error) {
    logger.error('Error downloading resource:', error);
    if (error instanceof Error && error.message === 'Resource not found') {
      res.status(404).json({ error: 'Resource not found' });
    } else {
      res.status(500).json({ error: 'Failed to download resource' });
    }
  }
};

export const rateResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    const resourceRating = await resourceService.rateResource(id, userId, rating);
    
    res.json({
      message: 'Resource rated successfully',
      rating: resourceRating
    });
  } catch (error) {
    logger.error('Error rating resource:', error);
    if (error instanceof Error && error.message === 'Resource not found') {
      res.status(404).json({ error: 'Resource not found' });
    } else {
      res.status(500).json({ error: 'Failed to rate resource' });
    }
  }
};

export const getResourceComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const comments = await resourceService.getResourceComments(id);
    
    res.json({ comments });
  } catch (error) {
    logger.error('Error fetching resource comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const addResourceComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const commentData: CreateResourceCommentRequest = req.body;

    if (!commentData.content || !commentData.content.trim()) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await resourceService.addResourceComment(id, userId, commentData);
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    logger.error('Error adding resource comment:', error);
    if (error instanceof Error && error.message === 'Resource not found') {
      res.status(404).json({ error: 'Resource not found' });
    } else {
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
};