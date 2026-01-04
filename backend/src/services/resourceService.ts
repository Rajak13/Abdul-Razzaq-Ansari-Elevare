import { Pool } from 'pg';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { 
  Resource, 
  CreateResourceRequest, 
  UpdateResourceRequest, 
  ResourceRating, 
  ResourceComment, 
  CreateResourceCommentRequest,
  ResourceSearchFilters 
} from '../types/resource';
import logger from '../utils/logger';

export class ResourceService {
  constructor(private db: Pool) {}

  async createResource(
    userId: string, 
    resourceData: CreateResourceRequest, 
    file: Express.Multer.File
  ): Promise<Resource> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const resourceId = randomUUID();
      const fileUrl = `/uploads/resources/${file.filename}`;
      
      const query = `
        INSERT INTO resources (
          id, user_id, title, description, file_url, file_name, 
          file_type, file_size, tags, download_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        resourceId,
        userId,
        resourceData.title,
        resourceData.description || null,
        fileUrl,
        file.originalname,
        file.mimetype,
        file.size,
        resourceData.tags || [],
        0
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      logger.info(`Resource created: ${resourceId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getResources(
    page: number = 1, 
    limit: number = 20, 
    sortBy: string = 'created_at',
    sortOrder: string = 'desc'
  ): Promise<{ resources: Resource[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'download_count', 'average_rating', 'title'];
    const validSortOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    const query = `
      SELECT 
        r.*, 
        u.name as user_name, 
        u.avatar_url as user_avatar,
        COALESCE(AVG(rt.rating), 0) as average_rating,
        COUNT(rt.rating) as rating_count
      FROM resources r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN resource_ratings rt ON r.id = rt.resource_id
      GROUP BY r.id, u.name, u.avatar_url
      ORDER BY r.${safeSortBy} ${safeSortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = 'SELECT COUNT(*) FROM resources';
    
    try {
      const [resourcesResult, countResult] = await Promise.all([
        this.db.query(query, [limit, offset]),
        this.db.query(countQuery)
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);
      
      // Process the resources to ensure proper data types
      const processedResources = resourcesResult.rows.map(resource => ({
        ...resource,
        rating_count: parseInt(resource.rating_count) || 0,
        average_rating: resource.rating_count > 0 ? parseFloat(resource.average_rating) : null
      }));
      
      return {
        resources: processedResources,
        total,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching resources:', error);
      throw error;
    }
  }

  async getResourceById(resourceId: string, userId?: string): Promise<Resource | null> {
    const query = `
      SELECT 
        r.*, 
        u.name as user_name, 
        u.avatar_url as user_avatar,
        COALESCE(AVG(rt.rating), 0) as average_rating,
        COUNT(rt.rating) as rating_count,
        ${userId ? `ur.rating as user_rating` : 'NULL as user_rating'}
      FROM resources r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN resource_ratings rt ON r.id = rt.resource_id
      ${userId ? `LEFT JOIN resource_ratings ur ON r.id = ur.resource_id AND ur.user_id = $2` : ''}
      WHERE r.id = $1
      GROUP BY r.id, u.name, u.avatar_url${userId ? ', ur.rating' : ''}
    `;
    
    try {
      const values = userId ? [resourceId, userId] : [resourceId];
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const resource = result.rows[0];
      // Convert rating_count to number and ensure average_rating is properly formatted
      resource.rating_count = parseInt(resource.rating_count) || 0;
      resource.average_rating = resource.rating_count > 0 ? parseFloat(resource.average_rating) : null;
      
      return resource;
    } catch (error) {
      logger.error('Error fetching resource by ID:', error);
      throw error;
    }
  }

  async updateResource(
    resourceId: string, 
    userId: string, 
    updateData: UpdateResourceRequest
  ): Promise<Resource | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the resource
      const ownershipQuery = 'SELECT user_id FROM resources WHERE id = $1';
      const ownershipResult = await client.query(ownershipQuery, [resourceId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Resource not found');
      }
      
      if (ownershipResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only update your own resources');
      }
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(updateData.title);
      }
      
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updateData.description);
      }
      
      if (updateData.tags !== undefined) {
        updateFields.push(`tags = $${paramCount++}`);
        values.push(updateData.tags);
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(resourceId);
      
      const query = `
        UPDATE resources 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      logger.info(`Resource updated: ${resourceId} by user ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteResource(resourceId: string, userId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user owns the resource and get file info
      const resourceQuery = 'SELECT user_id, file_url FROM resources WHERE id = $1';
      const resourceResult = await client.query(resourceQuery, [resourceId]);
      
      if (resourceResult.rows.length === 0) {
        throw new Error('Resource not found');
      }
      
      if (resourceResult.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You can only delete your own resources');
      }
      
      const fileUrl = resourceResult.rows[0].file_url;
      
      // Delete from database
      await client.query('DELETE FROM resource_comments WHERE resource_id = $1', [resourceId]);
      await client.query('DELETE FROM resource_ratings WHERE resource_id = $1', [resourceId]);
      await client.query('DELETE FROM resources WHERE id = $1', [resourceId]);
      
      await client.query('COMMIT');
      
      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), 'uploads', fileUrl.replace('/uploads/', ''));
        await fs.unlink(filePath);
      } catch (fileError) {
        logger.warn(`Could not delete file: ${fileUrl}`, fileError);
      }
      
      logger.info(`Resource deleted: ${resourceId} by user ${userId}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async searchResources(filters: ResourceSearchFilters): Promise<{
    resources: Resource[];
    total: number;
    totalPages: number;
  }> {
    const {
      query = '',
      tags = [],
      file_type,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = filters;
    
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramCount = 1;
    
    // Text search
    if (query.trim()) {
      conditions.push(`(r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`);
      values.push(`%${query.trim()}%`);
      paramCount++;
    }
    
    // Tag filter
    if (tags.length > 0) {
      conditions.push(`r.tags && $${paramCount}`);
      values.push(tags);
      paramCount++;
    }
    
    // File type filter
    if (file_type) {
      conditions.push(`r.file_type ILIKE $${paramCount}`);
      values.push(`%${file_type}%`);
      paramCount++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'download_count', 'average_rating', 'title'];
    const validSortOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const safeSortOrder = validSortOrders.includes(sort_order) ? sort_order : 'desc';
    
    const searchQuery = `
      SELECT 
        r.*, 
        u.name as user_name, 
        u.avatar_url as user_avatar,
        COALESCE(AVG(rt.rating), 0) as average_rating,
        COUNT(rt.rating) as rating_count
      FROM resources r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN resource_ratings rt ON r.id = rt.resource_id
      ${whereClause}
      GROUP BY r.id, u.name, u.avatar_url
      ORDER BY r.${safeSortBy} ${safeSortOrder.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*)
      FROM resources r
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
      
      // Process the resources to ensure proper data types
      const processedResources = searchResult.rows.map(resource => ({
        ...resource,
        rating_count: parseInt(resource.rating_count) || 0,
        average_rating: resource.rating_count > 0 ? parseFloat(resource.average_rating) : null
      }));
      
      return {
        resources: processedResources,
        total,
        totalPages
      };
    } catch (error) {
      logger.error('Error searching resources:', error);
      throw error;
    }
  }

  async downloadResource(resourceId: string): Promise<{ resource: Resource; filePath: string }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get resource info
      const resourceQuery = `
        SELECT r.*, u.name as user_name
        FROM resources r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = $1
      `;
      const resourceResult = await client.query(resourceQuery, [resourceId]);
      
      if (resourceResult.rows.length === 0) {
        throw new Error('Resource not found');
      }
      
      const resource = resourceResult.rows[0];
      
      // Increment download counter
      await client.query(
        'UPDATE resources SET download_count = download_count + 1 WHERE id = $1',
        [resourceId]
      );
      
      await client.query('COMMIT');
      
      const filePath = path.join(process.cwd(), 'uploads', resource.file_url.replace('/uploads/', ''));
      
      logger.info(`Resource downloaded: ${resourceId}`);
      return { resource, filePath };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error downloading resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rateResource(resourceId: string, userId: string, rating: number): Promise<ResourceRating> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if resource exists
      const resourceCheck = await client.query('SELECT id FROM resources WHERE id = $1', [resourceId]);
      if (resourceCheck.rows.length === 0) {
        throw new Error('Resource not found');
      }
      
      // Upsert rating
      const ratingId = randomUUID();
      const upsertQuery = `
        INSERT INTO resource_ratings (id, resource_id, user_id, rating, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (resource_id, user_id)
        DO UPDATE SET rating = $4, created_at = NOW()
        RETURNING *
      `;
      
      const ratingResult = await client.query(upsertQuery, [ratingId, resourceId, userId, rating]);
      
      // Update average rating
      const avgQuery = `
        UPDATE resources 
        SET average_rating = (
          SELECT AVG(rating)::DECIMAL(3,2) 
          FROM resource_ratings 
          WHERE resource_id = $1
        )
        WHERE id = $1
      `;
      
      await client.query(avgQuery, [resourceId]);
      await client.query('COMMIT');
      
      logger.info(`Resource rated: ${resourceId} by user ${userId} with rating ${rating}`);
      return ratingResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error rating resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getResourceComments(resourceId: string): Promise<ResourceComment[]> {
    const query = `
      SELECT rc.*, u.name as user_name, u.avatar_url as user_avatar
      FROM resource_comments rc
      JOIN users u ON rc.user_id = u.id
      WHERE rc.resource_id = $1
      ORDER BY rc.created_at DESC
    `;
    
    try {
      const result = await this.db.query(query, [resourceId]);
      return result.rows.map(row => ({
        ...row,
        user: {
          id: row.user_id,
          name: row.user_name,
          avatar_url: row.user_avatar
        }
      }));
    } catch (error) {
      logger.error('Error fetching resource comments:', error);
      throw error;
    }
  }

  async addResourceComment(
    resourceId: string, 
    userId: string, 
    commentData: CreateResourceCommentRequest
  ): Promise<ResourceComment> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if resource exists
      const resourceCheck = await client.query('SELECT id FROM resources WHERE id = $1', [resourceId]);
      if (resourceCheck.rows.length === 0) {
        throw new Error('Resource not found');
      }
      
      const commentId = randomUUID();
      const query = `
        INSERT INTO resource_comments (id, resource_id, user_id, content, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await client.query(query, [commentId, resourceId, userId, commentData.content]);
      
      // Get user info for the response
      const userQuery = 'SELECT name, avatar_url FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);
      
      await client.query('COMMIT');
      
      const comment = {
        ...result.rows[0],
        user: {
          id: userId,
          name: userResult.rows[0].name,
          avatar_url: userResult.rows[0].avatar_url
        }
      };
      
      logger.info(`Comment added to resource: ${resourceId} by user ${userId}`);
      return comment;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding resource comment:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}