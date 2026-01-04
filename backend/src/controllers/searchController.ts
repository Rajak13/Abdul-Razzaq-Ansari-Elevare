import { Request, Response } from 'express';
import { universalSearch, multiKeywordSearch, SearchOptions } from '../services/searchService';
import logger from '../utils/logger';

/**
 * Universal search endpoint
 */
export async function search(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      q: query,
      content_type,
      date_from,
      date_to,
      tags,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate required query parameter
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // Parse content types
    let contentTypes: ('task' | 'note' | 'resource' | 'file')[] | undefined;
    if (content_type) {
      if (typeof content_type === 'string') {
        contentTypes = content_type.split(',') as ('task' | 'note' | 'resource' | 'file')[];
      } else if (Array.isArray(content_type)) {
        contentTypes = content_type as ('task' | 'note' | 'resource' | 'file')[];
      }
    }

    // Parse tags
    let parsedTags: string[] | undefined;
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        parsedTags = tags as string[];
      }
    }

    const searchOptions: SearchOptions = {
      query: query.trim(),
      filters: {
        content_type: contentTypes,
        date_from: date_from as string,
        date_to: date_to as string,
        tags: parsedTags,
      },
      page: parseInt(page as string, 10) || 1,
      limit: Math.min(parseInt(limit as string, 10) || 20, 100), // Max 100 results per page
    };

    const results = await universalSearch(userId, searchOptions);

    res.json({
      success: true,
      data: results,
      query: query.trim(),
      filters: searchOptions.filters,
    });
  } catch (error) {
    logger.error('Error in search controller:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to perform search'
    });
  }
}

/**
 * Multi-keyword search with AND logic
 */
export async function multiKeywordSearchEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      keywords,
      content_type,
      date_from,
      date_to,
      tags,
    } = req.body;

    // Validate required keywords parameter
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: 'Keywords array is required' });
      return;
    }

    // Validate keywords are strings
    if (!keywords.every(k => typeof k === 'string' && k.trim().length > 0)) {
      res.status(400).json({ error: 'All keywords must be non-empty strings' });
      return;
    }

    // Parse content types
    let contentTypes: ('task' | 'note' | 'resource' | 'file')[] | undefined;
    if (content_type) {
      contentTypes = Array.isArray(content_type) ? content_type : [content_type];
    }

    const results = await multiKeywordSearch(
      userId,
      keywords.map((k: string) => k.trim()),
      {
        content_type: contentTypes,
        date_from,
        date_to,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : undefined),
      }
    );

    res.json({
      success: true,
      data: results,
      keywords: keywords.map((k: string) => k.trim()),
      search_logic: 'AND',
    });
  } catch (error) {
    logger.error('Error in multi-keyword search controller:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to perform multi-keyword search'
    });
  }
}

/**
 * Get search suggestions (placeholder for future implementation)
 */
export async function getSearchSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { q: query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.json({
        success: true,
        data: {
          suggestions: [],
          message: 'Query too short for suggestions'
        }
      });
      return;
    }

    // TODO: Implement search suggestions based on user's content
    // This could include:
    // - Recent searches
    // - Popular tags
    // - Frequently accessed content titles
    // - Auto-complete based on existing content

    res.json({
      success: true,
      data: {
        suggestions: [],
        message: 'Search suggestions not yet implemented'
      }
    });
  } catch (error) {
    logger.error('Error in search suggestions controller:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get search suggestions'
    });
  }
}