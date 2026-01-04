import { Pool } from 'pg';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { 
  File, 
  FileFolder,
  FileShare,
  CreateFileRequest, 
  UpdateFileRequest,
  CreateFileFolderRequest,
  UpdateFileFolderRequest,
  ShareFileRequest,
  FileSearchFilters 
} from '../types/file';
import logger from '../utils/logger';

export class FileService {
  constructor(private db: Pool) {}

  async uploadFile(
    userId: string, 
    fileData: CreateFileRequest, 
    file: Express.Multer.File
  ): Promise<File> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const fileId = randomUUID();
      const filePath = `/uploads/files/${file.filename}`;
      
      // Validate folder ownership if folder_id is provided
      if (fileData.folder_id) {
        const folderCheck = await client.query(
          'SELECT user_id FROM file_folders WHERE id = $1',
          [fileData.folder_id]
        );
        
        if (folderCheck.rows.length === 0) {
          throw new Error('Folder not found');
        }
        
        if (folderCheck.rows[0].user_id !== userId) {
          throw new Error('Unauthorized: You can only upload to your own folders');
        }
      }
      
      const query = `
        INSERT INTO files (
          id, user_id, name, path, size, mime_type, folder_id, is_shared, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        fileId,
        userId,
        fileData.name || file.originalname,
        filePath,
        file.size,
        file.mimetype,
        fileData.folder_id || null,
        false
      ];
      
      const result = await client.query(query, values);
      
      // Log the upload action
      await client.query(
        'INSERT INTO file_access_logs (id, file_id, user_id, action, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), fileId, userId, 'upload']
      );
      
      await client.query('COMMIT');
      
      logger.info(`File uploaded: ${fileId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error uploading file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getFiles(
    userId: string,
    folderId?: string,
    page: number = 1, 
    limit: number = 20, 
    sortBy: string = 'created_at',
    sortOrder: string = 'desc'
  ): Promise<{ files: File[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'name', 'size', 'mime_type'];
    const validSortOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    let whereClause = 'WHERE (f.user_id = $1 OR fs.shared_with_user_id = $1)';
    const values: any[] = [userId];
    let paramCount = 2;
    
    if (folderId !== undefined) {
      if (folderId === null || folderId === '') {
        whereClause += ` AND f.folder_id IS NULL`;
      } else {
        whereClause += ` AND f.folder_id = $${paramCount}`;
        values.push(folderId);
        paramCount++;
      }
    }
    
    const query = `
      SELECT DISTINCT f.*, 
             CASE WHEN f.user_id = $1 THEN true ELSE false END as is_owner
      FROM files f
      LEFT JOIN file_shares fs ON f.id = fs.file_id
      ${whereClause}
      ORDER BY f.${safeSortBy} ${safeSortOrder.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(DISTINCT f.id)
      FROM files f
      LEFT JOIN file_shares fs ON f.id = fs.file_id
      ${whereClause}
    `;
    
    values.push(limit, offset);
    
    try {
      const [filesResult, countResult] = await Promise.all([
        this.db.query(query, values),
        this.db.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);
      
      return {
        files: filesResult.rows,
        total,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching files:', error);
      throw error;
    }
  }

  async getFileById(fileId: string, userId: string): Promise<File | null> {
    const query = `
      SELECT DISTINCT f.*, 
             CASE WHEN f.user_id = $2 THEN true ELSE false END as is_owner
      FROM files f
      LEFT JOIN file_shares fs ON f.id = fs.file_id
      WHERE f.id = $1 AND (f.user_id = $2 OR fs.shared_with_user_id = $2)
    `;
    
    try {
      const result = await this.db.query(query, [fileId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching file by ID:', error);
      throw error;
    }
  }

  async updateFile(
    fileId: string, 
    userId: string, 
    updateData: UpdateFileRequest
  ): Promise<File | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the file
      const ownershipQuery = 'SELECT user_id FROM files WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [fileId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('File not found');
      }
      
      if (ownershipResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only update your own files');
      }
      
      // Validate folder ownership if folder_id is being updated
      if (updateData.folder_id) {
        const folderCheck = await client.query(
          'SELECT user_id FROM file_folders WHERE id = $1',
          [updateData.folder_id]
        );
        
        if (folderCheck.rows.length === 0) {
          throw new Error('Folder not found');
        }
        
        if (folderCheck.rows[0].user_id !== userId) {
          throw new Error('Unauthorized: You can only move files to your own folders');
        }
      }
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.folder_id !== undefined) {
        updateFields.push(`folder_id = $${paramCount++}`);
        values.push(updateData.folder_id || null);
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(fileId);
      
      const query = `
        UPDATE files 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      // Log the update action
      await client.query(
        'INSERT INTO file_access_logs (id, file_id, user_id, action, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), fileId, userId, 'update']
      );
      
      await client.query('COMMIT');
      
      logger.info(`File updated: ${fileId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the file and get file info
      const fileQuery = 'SELECT user_id, path FROM files WHERE id = $1';
      const fileResult = await client.query(fileQuery, [fileId]);
      
      if (fileResult.rows.length === 0) {
        throw new Error('File not found');
      }
      
      if (fileResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own files');
      }
      
      const filePath = fileResult.rows[0].path;
      
      // Delete from database (cascading will handle related records)
      await client.query('DELETE FROM files WHERE id = $1', [fileId]);
      
      await client.query('COMMIT');
      
      // Delete file from filesystem
      try {
        const fullPath = path.join(process.cwd(), 'uploads', filePath.replace('/uploads/', ''));
        await fs.unlink(fullPath);
      } catch (fileError) {
        logger.warn(`Could not delete file: ${filePath}`, fileError);
      }
      
      logger.info(`File deleted: ${fileId} by user ${userId}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async downloadFile(fileId: string, userId: string): Promise<{ file: File; filePath: string }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user has access to the file
      const fileQuery = `
        SELECT DISTINCT f.*
        FROM files f
        LEFT JOIN file_shares fs ON f.id = fs.file_id
        WHERE f.id = $1 AND (f.user_id = $2 OR fs.shared_with_user_id = $2)
      `;
      const fileResult = await client.query(fileQuery, [fileId, userId]);
      
      if (fileResult.rows.length === 0) {
        throw new Error('File not found or access denied');
      }
      
      const file = fileResult.rows[0];
      
      // Log the download action
      await client.query(
        'INSERT INTO file_access_logs (id, file_id, user_id, action, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), fileId, userId, 'download']
      );
      
      await client.query('COMMIT');
      
      const fullPath = path.join(process.cwd(), 'uploads', file.path.replace('/uploads/', ''));
      
      logger.info(`File downloaded: ${fileId} by user ${userId}`);
      return { file, filePath: fullPath };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error downloading file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async shareFile(fileId: string, userId: string, shareData: ShareFileRequest): Promise<FileShare[]> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the file
      const ownershipQuery = 'SELECT user_id FROM files WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [fileId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('File not found');
      }
      
      if (ownershipResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only share your own files');
      }
      
      // Validate that all user IDs exist
      if (shareData.user_ids.length > 0) {
        const userCheckQuery = 'SELECT id FROM users WHERE id = ANY($1)';
        const userCheckResult = await client.query(userCheckQuery, [shareData.user_ids]);
        
        if (userCheckResult.rows.length !== shareData.user_ids.length) {
          throw new Error('One or more user IDs are invalid');
        }
      }
      
      // Remove existing shares for this file
      await client.query('DELETE FROM file_shares WHERE file_id = $1', [fileId]);
      
      // Add new shares
      const shares: FileShare[] = [];
      for (const sharedUserId of shareData.user_ids) {
        const shareId = randomUUID();
        const shareQuery = `
          INSERT INTO file_shares (id, file_id, shared_with_user_id, shared_by_user_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *
        `;
        
        const shareResult = await client.query(shareQuery, [shareId, fileId, sharedUserId, userId]);
        shares.push(shareResult.rows[0]);
      }
      
      // Update file is_shared status
      await client.query(
        'UPDATE files SET is_shared = $1 WHERE id = $2',
        [shareData.user_ids.length > 0, fileId]
      );
      
      // Log the share action
      await client.query(
        'INSERT INTO file_access_logs (id, file_id, user_id, action, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), fileId, userId, 'share']
      );
      
      await client.query('COMMIT');
      
      logger.info(`File shared: ${fileId} by user ${userId} with ${shareData.user_ids.length} users`);
      return shares;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error sharing file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async searchFiles(userId: string, filters: FileSearchFilters): Promise<{
    files: File[];
    total: number;
    totalPages: number;
  }> {
    const {
      query = '',
      folder_id,
      mime_type,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = filters;
    
    const offset = (page - 1) * limit;
    const conditions = ['(f.user_id = $1 OR fs.shared_with_user_id = $1)'];
    const values: any[] = [userId];
    let paramCount = 2;
    
    // Text search
    if (query.trim()) {
      conditions.push(`f.name ILIKE $${paramCount}`);
      values.push(`%${query.trim()}%`);
      paramCount++;
    }
    
    // Folder filter
    if (folder_id !== undefined) {
      if (folder_id === null || folder_id === '') {
        conditions.push('f.folder_id IS NULL');
      } else {
        conditions.push(`f.folder_id = $${paramCount}`);
        values.push(folder_id);
        paramCount++;
      }
    }
    
    // MIME type filter
    if (mime_type) {
      conditions.push(`f.mime_type ILIKE $${paramCount}`);
      values.push(`%${mime_type}%`);
      paramCount++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'name', 'size', 'mime_type'];
    const validSortOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = validSortOrders.includes(sort_order) ? sort_order : 'desc';
    
    const searchQuery = `
      SELECT DISTINCT f.*, 
             CASE WHEN f.user_id = $1 THEN true ELSE false END as is_owner
      FROM files f
      LEFT JOIN file_shares fs ON f.id = fs.file_id
      ${whereClause}
      ORDER BY f.${safeSortBy} ${safeSortOrder.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(DISTINCT f.id)
      FROM files f
      LEFT JOIN file_shares fs ON f.id = fs.file_id
      ${whereClause}
    `;
    
    values.push(limit, offset);
    
    try {
      const [searchResult, countResult] = await Promise.all([
        this.db.query(searchQuery, values),
        this.db.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);
      
      return {
        files: searchResult.rows,
        total,
        totalPages
      };
    } catch (error) {
      logger.error('Error searching files:', error);
      throw error;
    }
  }

  // File Folder Management Methods

  async createFileFolder(
    userId: string, 
    folderData: CreateFileFolderRequest
  ): Promise<FileFolder> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const folderId = randomUUID();
      
      // Validate parent folder ownership if parent_id is provided
      if (folderData.parent_id) {
        const parentCheck = await client.query(
          'SELECT user_id FROM file_folders WHERE id = $1',
          [folderData.parent_id]
        );
        
        if (parentCheck.rows.length === 0) {
          throw new Error('Parent folder not found');
        }
        
        if (parentCheck.rows[0].user_id !== userId) {
          throw new Error('Unauthorized: You can only create folders under your own folders');
        }
      }
      
      const query = `
        INSERT INTO file_folders (id, user_id, name, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        folderId,
        userId,
        folderData.name,
        folderData.parent_id || null
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      logger.info(`File folder created: ${folderId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating file folder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getFileFolders(
    userId: string,
    parentId?: string,
    page: number = 1, 
    limit: number = 50
  ): Promise<{ folders: FileFolder[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;
    
    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        whereClause += ` AND parent_id IS NULL`;
      } else {
        whereClause += ` AND parent_id = $${paramCount}`;
        values.push(parentId);
        paramCount++;
      }
    }
    
    const query = `
      SELECT *
      FROM file_folders
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*)
      FROM file_folders
      ${whereClause}
    `;
    
    values.push(limit, offset);
    
    try {
      const [foldersResult, countResult] = await Promise.all([
        this.db.query(query, values),
        this.db.query(countQuery, values.slice(0, -2)) // Remove limit and offset for count
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);
      
      return {
        folders: foldersResult.rows,
        total,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching file folders:', error);
      throw error;
    }
  }

  async getFileFolderById(folderId: string, userId: string): Promise<FileFolder | null> {
    const query = `
      SELECT *
      FROM file_folders
      WHERE id = $1 AND user_id = $2
    `;
    
    try {
      const result = await this.db.query(query, [folderId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching file folder by ID:', error);
      throw error;
    }
  }

  async updateFileFolder(
    folderId: string, 
    userId: string, 
    updateData: UpdateFileFolderRequest
  ): Promise<FileFolder | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the folder
      const ownershipQuery = 'SELECT user_id FROM file_folders WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [folderId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Folder not found');
      }
      
      if (ownershipResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only update your own folders');
      }
      
      // Validate parent folder ownership if parent_id is being updated
      if (updateData.parent_id) {
        const parentCheck = await client.query(
          'SELECT user_id FROM file_folders WHERE id = $1',
          [updateData.parent_id]
        );
        
        if (parentCheck.rows.length === 0) {
          throw new Error('Parent folder not found');
        }
        
        if (parentCheck.rows[0].user_id !== userId) {
          throw new Error('Unauthorized: You can only move folders under your own folders');
        }
        
        // Prevent circular references
        if (updateData.parent_id === folderId) {
          throw new Error('Cannot move folder into itself');
        }
      }
      
      const updateFields = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      
      if (updateData.parent_id !== undefined) {
        updateFields.push(`parent_id = $${paramCount++}`);
        values.push(updateData.parent_id || null);
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(folderId);
      
      const query = `
        UPDATE file_folders 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      logger.info(`File folder updated: ${folderId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating file folder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteFileFolder(folderId: string, userId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the folder
      const folderQuery = 'SELECT user_id FROM file_folders WHERE id = $1';
      const folderResult = await client.query(folderQuery, [folderId]);
      
      if (folderResult.rows.length === 0) {
        throw new Error('Folder not found');
      }
      
      if (folderResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own folders');
      }
      
      // Check if folder has any files
      const filesCheck = await client.query(
        'SELECT COUNT(*) FROM files WHERE folder_id = $1',
        [folderId]
      );
      
      if (parseInt(filesCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete folder that contains files');
      }
      
      // Check if folder has any subfolders
      const subfoldersCheck = await client.query(
        'SELECT COUNT(*) FROM file_folders WHERE parent_id = $1',
        [folderId]
      );
      
      if (parseInt(subfoldersCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete folder that contains subfolders');
      }
      
      // Delete the folder
      await client.query('DELETE FROM file_folders WHERE id = $1', [folderId]);
      
      await client.query('COMMIT');
      
      logger.info(`File folder deleted: ${folderId} by user ${userId}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting file folder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}