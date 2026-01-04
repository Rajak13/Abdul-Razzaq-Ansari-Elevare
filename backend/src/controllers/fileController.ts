import { Request, Response } from 'express';
import { FileService } from '../services/fileService';
import pool from '../db/connection';
import logger from '../utils/logger';
import { CreateFileRequest, UpdateFileRequest, ShareFileRequest, CreateFileFolderRequest, UpdateFileFolderRequest } from '../types/file';

const fileService = new FileService(pool);

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
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

    const fileData: CreateFileRequest = {
      name: req.body.name || req.file.originalname,
      folder_id: req.body.folder_id || undefined
    };

    const file = await fileService.uploadFile(userId, fileData, req.file);
    
    res.status(201).json({
      message: 'File uploaded successfully',
      file
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    if (error instanceof Error) {
      if (error.message.includes('Folder not found')) {
        res.status(404).json({ error: 'Folder not found' });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload file' });
      }
    } else {
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }
};

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folderId = req.query.folder_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sort_by as string || 'created_at';
    const sortOrder = req.query.sort_order as string || 'desc';

    const result = await fileService.getFiles(userId, folderId, page, limit, sortBy, sortOrder);
    
    res.json({
      files: result.files,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const getFileById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    
    const file = await fileService.getFileById(id, userId);
    
    if (!file) {
      res.status(404).json({ error: 'File not found or access denied' });
      return;
    }
    
    res.json({ file });
  } catch (error) {
    logger.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
};

export const updateFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData: UpdateFileRequest = req.body;

    const file = await fileService.updateFile(id, userId, updateData);
    
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    res.json({
      message: 'File updated successfully',
      file
    });
  } catch (error) {
    logger.error('Error updating file:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update file' });
      }
    } else {
      res.status(500).json({ error: 'Failed to update file' });
    }
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const success = await fileService.deleteFile(id, userId);
    
    if (!success) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Error deleting file:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete file' });
      }
    } else {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    
    const { file, filePath } = await fileService.downloadFile(id, userId);
    
    res.download(filePath, file.name, (err) => {
      if (err) {
        logger.error('Error serving file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error) {
    logger.error('Error downloading file:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'File not found or access denied' });
    } else {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
};

export const shareFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const shareData: ShareFileRequest = req.body;

    if (!shareData.user_ids || !Array.isArray(shareData.user_ids)) {
      res.status(400).json({ error: 'user_ids array is required' });
      return;
    }

    const shares = await fileService.shareFile(id, userId, shareData);
    
    res.json({
      message: 'File shared successfully',
      shares
    });
  } catch (error) {
    logger.error('Error sharing file:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('invalid')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to share file' });
      }
    } else {
      res.status(500).json({ error: 'Failed to share file' });
    }
  }
};

export const searchFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters = {
      query: req.query.q as string,
      folder_id: req.query.folder_id as string,
      mime_type: req.query.mime_type as string,
      sort_by: (req.query.sort_by as string) || 'created_at',
      sort_order: (req.query.sort_order as string) || 'desc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await fileService.searchFiles(userId, filters);
    
    res.json({
      files: result.files,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error('Error searching files:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
};

// File Folder Controllers

export const createFileFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const folderData: CreateFileFolderRequest = req.body;

    if (!folderData.name || !folderData.name.trim()) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    const folder = await fileService.createFileFolder(userId, folderData);
    
    res.status(201).json({
      message: 'File folder created successfully',
      folder
    });
  } catch (error) {
    logger.error('Error creating file folder:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create file folder' });
      }
    } else {
      res.status(500).json({ error: 'Failed to create file folder' });
    }
  }
};

export const getFileFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parentId = req.query.parent_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await fileService.getFileFolders(userId, parentId, page, limit);
    
    res.json({
      folders: result.folders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching file folders:', error);
    res.status(500).json({ error: 'Failed to fetch file folders' });
  }
};

export const getFileFolderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    
    const folder = await fileService.getFileFolderById(id, userId);
    
    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    
    res.json({ folder });
  } catch (error) {
    logger.error('Error fetching file folder:', error);
    res.status(500).json({ error: 'Failed to fetch file folder' });
  }
};

export const updateFileFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData: UpdateFileFolderRequest = req.body;

    const folder = await fileService.updateFileFolder(id, userId, updateData);
    
    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    
    res.json({
      message: 'File folder updated successfully',
      folder
    });
  } catch (error) {
    logger.error('Error updating file folder:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('Cannot move folder')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update file folder' });
      }
    } else {
      res.status(500).json({ error: 'Failed to update file folder' });
    }
  }
};

export const deleteFileFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const success = await fileService.deleteFileFolder(id, userId);
    
    if (!success) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    
    res.json({ message: 'File folder deleted successfully' });
  } catch (error) {
    logger.error('Error deleting file folder:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('Cannot delete folder')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete file folder' });
      }
    } else {
      res.status(500).json({ error: 'Failed to delete file folder' });
    }
  }
};