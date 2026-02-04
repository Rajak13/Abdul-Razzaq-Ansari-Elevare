import { query } from '../db/connection';
import logger from '../utils/logger';

export interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'resource' | 'group';
  title: string;
  content?: string;
  snippet?: string;
  highlighted_snippet?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: {
    priority?: string;
    status?: string;
    due_date?: Date;
    tags?: string[];
    folder_name?: string;
    category_name?: string;
    file_type?: string;
    file_size?: number;
    download_count?: number;
    average_rating?: number;
    user_name?: string;
    member_count?: number;
    is_private?: boolean;
  };
}

export interface SearchFilters {
  content_type?: ('task' | 'note' | 'resource' | 'group')[];
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
}

/**
 * Universal search across all content types
 * - Resources and Groups are searched globally (all users can discover them)
 * - Tasks and Notes are searched only for the current user
 */
export async function universalSearch(
  userId: string,
  options: SearchOptions
): Promise<{
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const { query: searchQuery, filters = {}, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Build content type filter - default to resources and groups for discovery
    const contentTypes = filters.content_type || ['resource', 'group', 'task', 'note'];
    const searchResults: SearchResult[] = [];
    let totalCount = 0;

    // Search resources if included (GLOBAL - all users' resources)
    if (contentTypes.includes('resource')) {
      const resourceResults = await searchResources(searchQuery, filters);
      searchResults.push(...resourceResults.results);
      totalCount += resourceResults.total;
    }

    // Search groups if included (GLOBAL - all study groups)
    if (contentTypes.includes('group')) {
      const groupResults = await searchGroups(searchQuery, filters);
      searchResults.push(...groupResults.results);
      totalCount += groupResults.total;
    }

    // Search tasks if included (USER-SPECIFIC - only user's own tasks)
    if (contentTypes.includes('task')) {
      const taskResults = await searchTasks(userId, searchQuery, filters);
      searchResults.push(...taskResults.results);
      totalCount += taskResults.total;
    }

    // Search notes if included (USER-SPECIFIC - only user's own notes)
    if (contentTypes.includes('note')) {
      const noteResults = await searchNotes(userId, searchQuery, filters);
      searchResults.push(...noteResults.results);
      totalCount += noteResults.total;
    }

    // Sort results by relevance/date
    searchResults.sort((a, b) => {
      // First sort by relevance (if snippet contains exact match)
      const aExactMatch = a.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
      const bExactMatch = b.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0;
      
      if (aExactMatch !== bExactMatch) {
        return bExactMatch - aExactMatch;
      }
      
      // Then sort by updated date
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    // Apply pagination to combined results
    const paginatedResults = searchResults.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      results: paginatedResults,
      total: totalCount,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    logger.error('Error in universal search:', error);
    throw error;
  }
}

/**
 * Search tasks (USER-SPECIFIC - only searches user's own tasks)
 */
async function searchTasks(
  userId: string,
  searchQuery: string,
  filters: SearchFilters
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    let whereConditions = ['t.user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    // Add search condition
    whereConditions.push(`(
      t.title ILIKE $${paramIndex} OR 
      t.description ILIKE $${paramIndex} OR
      to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', $${paramIndex + 1})
    )`);
    queryParams.push(`%${searchQuery}%`, searchQuery);
    paramIndex += 2;

    // Add date filters
    if (filters.date_from) {
      whereConditions.push(`t.created_at >= $${paramIndex}`);
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`t.created_at <= $${paramIndex}`);
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`t.tags && $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get tasks with category names
    const tasksQuery = `
      SELECT 
        t.*,
        tc.name as category_name,
        ts_rank(to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', $${paramIndex})) as rank
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE ${whereClause}
      ORDER BY rank DESC, t.updated_at DESC
    `;
    
    queryParams.push(searchQuery);
    const tasksResult = await query(tasksQuery, queryParams);

    const results: SearchResult[] = tasksResult.rows.map((task: any) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      content: task.description || '',
      snippet: generateSnippet(task.title + ' ' + (task.description || ''), searchQuery),
      highlighted_snippet: highlightKeywords(
        generateSnippet(task.title + ' ' + (task.description || ''), searchQuery),
        searchQuery
      ),
      created_at: task.created_at,
      updated_at: task.updated_at,
      metadata: {
        priority: task.priority,
        status: task.status,
        due_date: task.due_date,
        tags: task.tags || [],
        category_name: task.category_name,
      },
    }));

    return { results, total };
  } catch (error) {
    logger.error('Error searching tasks:', error);
    throw error;
  }
}

/**
 * Search notes (USER-SPECIFIC - only searches user's own notes)
 */
async function searchNotes(
  userId: string,
  searchQuery: string,
  filters: SearchFilters
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    let whereConditions = ['n.user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    // Add search condition
    whereConditions.push(`(
      n.title ILIKE $${paramIndex} OR 
      n.content ILIKE $${paramIndex} OR
      to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', $${paramIndex + 1})
    )`);
    queryParams.push(`%${searchQuery}%`, searchQuery);
    paramIndex += 2;

    // Add date filters
    if (filters.date_from) {
      whereConditions.push(`n.created_at >= $${paramIndex}`);
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`n.created_at <= $${paramIndex}`);
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`n.tags && $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM notes n
      LEFT JOIN note_folders nf ON n.folder_id = nf.id
      WHERE ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get notes with folder names
    const notesQuery = `
      SELECT 
        n.*,
        nf.name as folder_name,
        ts_rank(to_tsvector('english', n.title || ' ' || n.content), plainto_tsquery('english', $${paramIndex})) as rank
      FROM notes n
      LEFT JOIN note_folders nf ON n.folder_id = nf.id
      WHERE ${whereClause}
      ORDER BY rank DESC, n.updated_at DESC
    `;
    
    queryParams.push(searchQuery);
    const notesResult = await query(notesQuery, queryParams);

    const results: SearchResult[] = notesResult.rows.map((note: any) => ({
      id: note.id,
      type: 'note' as const,
      title: note.title,
      content: note.content,
      snippet: generateSnippet(note.title + ' ' + note.content, searchQuery),
      highlighted_snippet: highlightKeywords(
        generateSnippet(note.title + ' ' + note.content, searchQuery),
        searchQuery
      ),
      created_at: note.created_at,
      updated_at: note.updated_at,
      metadata: {
        tags: note.tags || [],
        folder_name: note.folder_name,
      },
    }));

    return { results, total };
  } catch (error) {
    logger.error('Error searching notes:', error);
    throw error;
  }
}

/**
 * Search resources (GLOBAL - searches all users' public resources)
 */
async function searchResources(
  searchQuery: string,
  filters: SearchFilters
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Add search condition
    whereConditions.push(`(
      r.title ILIKE $${paramIndex} OR 
      r.description ILIKE $${paramIndex} OR
      to_tsvector('english', r.title || ' ' || COALESCE(r.description, '')) @@ plainto_tsquery('english', $${paramIndex + 1})
    )`);
    queryParams.push(`%${searchQuery}%`, searchQuery);
    paramIndex += 2;

    // Add date filters
    if (filters.date_from) {
      whereConditions.push(`r.created_at >= $${paramIndex}`);
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`r.created_at <= $${paramIndex}`);
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`r.tags && $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM resources r
      ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get resources with user info and ratings
    const resourcesQuery = `
      SELECT 
        r.*,
        u.name as user_name,
        u.avatar_url as user_avatar,
        COALESCE(AVG(rt.rating), 0) as average_rating,
        COUNT(rt.rating) as rating_count,
        ts_rank(to_tsvector('english', r.title || ' ' || COALESCE(r.description, '')), plainto_tsquery('english', $${paramIndex})) as rank
      FROM resources r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN resource_ratings rt ON r.id = rt.resource_id
      ${whereClause}
      GROUP BY r.id, u.name, u.avatar_url
      ORDER BY rank DESC, r.download_count DESC, r.created_at DESC
    `;
    
    queryParams.push(searchQuery);
    const resourcesResult = await query(resourcesQuery, queryParams);

    const results: SearchResult[] = resourcesResult.rows.map((resource: any) => ({
      id: resource.id,
      type: 'resource' as const,
      title: resource.title,
      content: resource.description || '',
      snippet: generateSnippet(resource.title + ' ' + (resource.description || ''), searchQuery),
      highlighted_snippet: highlightKeywords(
        generateSnippet(resource.title + ' ' + (resource.description || ''), searchQuery),
        searchQuery
      ),
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      metadata: {
        tags: resource.tags || [],
        file_type: resource.file_type,
        file_size: resource.file_size,
        download_count: resource.download_count,
        average_rating: parseFloat(resource.average_rating) || 0,
        user_name: resource.user_name,
      },
    }));

    return { results, total };
  } catch (error) {
    logger.error('Error searching resources:', error);
    throw error;
  }
}

/**
 * Search study groups (GLOBAL - searches all study groups)
 */
async function searchGroups(
  searchQuery: string,
  filters: SearchFilters
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Add search condition
    whereConditions.push(`(
      sg.name ILIKE $${paramIndex} OR 
      sg.description ILIKE $${paramIndex} OR
      to_tsvector('english', sg.name || ' ' || COALESCE(sg.description, '')) @@ plainto_tsquery('english', $${paramIndex + 1})
    )`);
    queryParams.push(`%${searchQuery}%`, searchQuery);
    paramIndex += 2;

    // Add date filters
    if (filters.date_from) {
      whereConditions.push(`sg.created_at >= $${paramIndex}`);
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`sg.created_at <= $${paramIndex}`);
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM study_groups sg
      ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get groups with member count and owner info
    const groupsQuery = `
      SELECT 
        sg.*,
        u.name as owner_name,
        u.avatar_url as owner_avatar,
        COUNT(gm.id) as member_count,
        ts_rank(to_tsvector('english', sg.name || ' ' || COALESCE(sg.description, '')), plainto_tsquery('english', $${paramIndex})) as rank
      FROM study_groups sg
      JOIN users u ON sg.owner_id = u.id
      LEFT JOIN group_members gm ON gm.group_id = sg.id
      ${whereClause}
      GROUP BY sg.id, u.name, u.avatar_url
      ORDER BY rank DESC, member_count DESC, sg.created_at DESC
    `;
    
    queryParams.push(searchQuery);
    const groupsResult = await query(groupsQuery, queryParams);

    const results: SearchResult[] = groupsResult.rows.map((group: any) => ({
      id: group.id,
      type: 'group' as const,
      title: group.name,
      content: group.description || '',
      snippet: generateSnippet(group.name + ' ' + (group.description || ''), searchQuery),
      highlighted_snippet: highlightKeywords(
        generateSnippet(group.name + ' ' + (group.description || ''), searchQuery),
        searchQuery
      ),
      created_at: group.created_at,
      updated_at: group.updated_at,
      metadata: {
        member_count: parseInt(group.member_count) || 0,
        is_private: group.is_private,
        user_name: group.owner_name,
      },
    }));

    return { results, total };
  } catch (error) {
    logger.error('Error searching groups:', error);
    throw error;
  }
}

/**
 * Generate a snippet around the search query
 */
function generateSnippet(text: string, searchQuery: string, maxLength: number = 200): string {
  if (!text || !searchQuery) return text?.substring(0, maxLength) || '';

  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  const queryIndex = lowerText.indexOf(lowerQuery);

  if (queryIndex === -1) {
    // Query not found, return beginning of text
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calculate snippet boundaries
  const snippetStart = Math.max(0, queryIndex - Math.floor((maxLength - searchQuery.length) / 2));
  const snippetEnd = Math.min(text.length, snippetStart + maxLength);

  let snippet = text.substring(snippetStart, snippetEnd);

  // Add ellipsis if needed
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Highlight keywords in text
 */
function highlightKeywords(text: string, searchQuery: string): string {
  if (!text || !searchQuery) return text || '';

  const keywords = searchQuery.split(/\s+/).filter(k => k.length > 0);
  let highlightedText = text;

  keywords.forEach(keyword => {
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });

  return highlightedText;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search with multi-keyword AND logic
 */
export async function multiKeywordSearch(
  userId: string,
  keywords: string[],
  filters?: SearchFilters
): Promise<{
  results: SearchResult[];
  total: number;
}> {
  try {
    if (keywords.length === 0) {
      return { results: [], total: 0 };
    }

    // For multi-keyword search, we need all keywords to match
    const searchQuery = keywords.join(' & '); // PostgreSQL full-text search AND operator

    const options: SearchOptions = {
      query: searchQuery,
      filters,
      page: 1,
      limit: 1000, // Get all results for multi-keyword filtering
    };

    const searchResults = await universalSearch(userId, options);

    // Filter results to ensure ALL keywords are present
    const filteredResults = searchResults.results.filter(result => {
      const searchText = (result.title + ' ' + (result.content || '')).toLowerCase();
      return keywords.every(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
    });

    return {
      results: filteredResults,
      total: filteredResults.length,
    };
  } catch (error) {
    logger.error('Error in multi-keyword search:', error);
    throw error;
  }
}
