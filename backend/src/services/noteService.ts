import pool from '../db/connection';
import { 
  Note, 
  NoteFolder, 
  CreateNoteInput, 
  UpdateNoteInput, 
  CreateNoteFolderInput,
  UpdateNoteFolderInput,
  NoteQueryParams 
} from '../types/note';
import logger from '../utils/logger';

/**
 * Create a new note
 */
export async function createNote(userId: string, noteData: CreateNoteInput): Promise<Note> {
  const client = await pool.connect();
  
  try {
    const { title, content, folder_id, tags = [], is_collaborative = false } = noteData;
    
    const query = `
      INSERT INTO notes (user_id, title, content, folder_id, tags, is_collaborative)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [userId, title, content, folder_id || null, tags, is_collaborative];
    const result = await client.query(query, values);
    
    logger.info(`Note created successfully for user ${userId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating note:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get notes with filtering and pagination
 */
export async function getNotes(userId: string, params: NoteQueryParams = {}): Promise<{
  notes: Note[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const client = await pool.connect();
  
  try {
    const {
      folder_id,
      tags,
      is_collaborative,
      search,
      sort_by = 'updated_at',
      order = 'desc',
      page = 1,
      limit = 20
    } = params;

    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (folder_id !== undefined) {
      if (folder_id === null || folder_id === '') {
        whereConditions.push('folder_id IS NULL');
      } else {
        whereConditions.push(`folder_id = $${paramIndex}`);
        queryParams.push(folder_id);
        paramIndex++;
      }
    }

    if (tags && tags.length > 0) {
      whereConditions.push(`tags && $${paramIndex}`);
      queryParams.push(tags);
      paramIndex++;
    }

    if (is_collaborative !== undefined) {
      whereConditions.push(`is_collaborative = $${paramIndex}`);
      queryParams.push(is_collaborative);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        content ILIKE $${paramIndex} OR
        to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $${paramIndex + 1})
      )`);
      queryParams.push(`%${search}%`, search);
      paramIndex += 2;
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM notes WHERE ${whereClause}`;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get notes
    const notesQuery = `
      SELECT * FROM notes 
      WHERE ${whereClause}
      ORDER BY ${sort_by} ${order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const notesResult = await client.query(notesQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    return {
      notes: notesResult.rows,
      total,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    logger.error('Error getting notes:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a single note by ID
 */
export async function getNoteById(userId: string, noteId: string): Promise<Note | null> {
  const client = await pool.connect();
  
  try {
    const query = 'SELECT * FROM notes WHERE id = $1 AND user_id = $2';
    const result = await client.query(query, [noteId, userId]);
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting note by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a note
 */
export async function updateNote(userId: string, noteId: string, updates: UpdateNoteInput): Promise<Note | null> {
  const client = await pool.connect();
  
  try {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      // No updates provided, return current note
      return await getNoteById(userId, noteId);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(noteId, userId);

    const query = `
      UPDATE notes 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Note ${noteId} updated successfully`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating note:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a note
 */
export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    const query = 'DELETE FROM notes WHERE id = $1 AND user_id = $2';
    const result = await client.query(query, [noteId, userId]);
    
    const deleted = (result.rowCount || 0) > 0;
    if (deleted) {
      logger.info(`Note ${noteId} deleted successfully`);
    }
    
    return deleted;
  } catch (error) {
    logger.error('Error deleting note:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Auto-save note content
 */
export async function autoSaveNote(userId: string, noteId: string, content: string): Promise<{ success: boolean; timestamp: Date }> {
  const client = await pool.connect();
  
  try {
    const query = `
      UPDATE notes 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING updated_at
    `;
    
    const result = await client.query(query, [content, noteId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Note not found or access denied');
    }

    return {
      success: true,
      timestamp: result.rows[0].updated_at
    };
  } catch (error) {
    logger.error('Error auto-saving note:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Search notes by keyword
 */
export async function searchNotes(userId: string, keyword: string): Promise<Note[]> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT *, 
             ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $2)) as rank
      FROM notes 
      WHERE user_id = $1 
        AND (
          title ILIKE $3 OR 
          content ILIKE $3 OR
          to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $2)
        )
      ORDER BY rank DESC, updated_at DESC
    `;
    
    const searchPattern = `%${keyword}%`;
    const result = await client.query(query, [userId, keyword, searchPattern]);
    
    return result.rows;
  } catch (error) {
    logger.error('Error searching notes:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a note folder
 */
export async function createNoteFolder(userId: string, folderData: CreateNoteFolderInput): Promise<NoteFolder> {
  const client = await pool.connect();
  
  try {
    const { name, parent_id, color = '#6b7280' } = folderData;
    
    const query = `
      INSERT INTO note_folders (user_id, name, parent_id, color)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [userId, name, parent_id || null, color];
    const result = await client.query(query, values);
    
    logger.info(`Note folder created successfully for user ${userId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating note folder:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get note folders for a user
 */
export async function getNoteFolders(userId: string): Promise<NoteFolder[]> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT * FROM note_folders 
      WHERE user_id = $1 
      ORDER BY name ASC
    `;
    
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    logger.error('Error getting note folders:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a note folder
 */
export async function updateNoteFolder(userId: string, folderId: string, updates: UpdateNoteFolderInput): Promise<NoteFolder | null> {
  const client = await pool.connect();
  
  try {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      // No updates provided, return current folder
      const query = 'SELECT * FROM note_folders WHERE id = $1 AND user_id = $2';
      const result = await client.query(query, [folderId, userId]);
      return result.rows[0] || null;
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(folderId, userId);

    const query = `
      UPDATE note_folders 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Note folder ${folderId} updated successfully`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating note folder:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a note folder
 */
export async function deleteNoteFolder(userId: string, folderId: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    // First, move all notes in this folder to root (folder_id = null)
    await client.query(
      'UPDATE notes SET folder_id = NULL WHERE folder_id = $1 AND user_id = $2',
      [folderId, userId]
    );
    
    // Then delete the folder
    const query = 'DELETE FROM note_folders WHERE id = $1 AND user_id = $2';
    const result = await client.query(query, [folderId, userId]);
    
    const deleted = (result.rowCount || 0) > 0;
    if (deleted) {
      logger.info(`Note folder ${folderId} deleted successfully`);
    }
    
    return deleted;
  } catch (error) {
    logger.error('Error deleting note folder:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Export a note to various formats
 */
export async function exportNote(userId: string, noteId: string, options: { format: string; include_summary?: boolean }): Promise<{ title: string; content: string } | null> {
  const client = await pool.connect();
  
  try {
    // Get the note
    const note = await getNoteById(userId, noteId);
    if (!note) {
      return null;
    }

    const { format, include_summary = false } = options;
    let exportContent = '';

    // Convert content based on format
    switch (format) {
      case 'markdown':
        exportContent = convertHtmlToMarkdown(note.content);
        break;
      case 'html':
        exportContent = formatAsHtml(note);
        break;
      case 'pdf':
        // For PDF, we'll use HTML as the base format
        exportContent = formatAsHtml(note);
        break;
      default:
        exportContent = stripHtmlTags(note.content);
    }

    // Add summary if requested
    if (include_summary) {
      try {
        const summary = await generateNoteSummary(userId, noteId, { length: 'medium' });
        if (summary) {
          const summarySection = format === 'html' 
            ? `<div class="summary"><h2>Summary</h2><p>${summary}</p></div><hr/>`
            : format === 'markdown'
            ? `## Summary\n\n${summary}\n\n---\n\n`
            : `Summary:\n${summary}\n\n---\n\n`;
          
          exportContent = summarySection + exportContent;
        }
      } catch (error) {
        logger.warn('Failed to generate summary for export:', error);
        // Continue without summary if generation fails
      }
    }

    return {
      title: note.title,
      content: exportContent
    };
  } catch (error) {
    logger.error('Error exporting note:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Convert HTML content to Markdown
 */
function convertHtmlToMarkdown(html: string): string {
  // Basic HTML to Markdown conversion
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match, content) => {
    const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    return items + '\n';
  });
  
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, content) => {
    let counter = 1;
    const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
    return items + '\n';
  });
  
  // Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
}

/**
 * Format note as HTML
 */
function formatAsHtml(note: Note): string {
  const createdDate = new Date(note.created_at).toLocaleDateString();
  const updatedDate = new Date(note.updated_at).toLocaleDateString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(note.title)}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; margin-bottom: 20px; padding-bottom: 10px; }
        .title { color: #333; margin-bottom: 10px; }
        .meta { color: #666; font-size: 0.9em; }
        .tags { margin: 10px 0; }
        .tag { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; margin-right: 5px; font-size: 0.8em; }
        .content { margin-top: 20px; }
        .summary { background: #f9f9f9; padding: 15px; border-left: 4px solid #007acc; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${escapeHtml(note.title)}</h1>
        <div class="meta">
            Created: ${createdDate} | Updated: ${updatedDate}
            ${note.is_collaborative ? ' | Collaborative' : ''}
        </div>
        ${note.tags.length > 0 ? `
        <div class="tags">
            ${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        ` : ''}
    </div>
    <div class="content">
        ${note.content}
    </div>
</body>
</html>`;
}

/**
 * Strip HTML tags from content
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate note summary (placeholder implementation)
 */
async function generateNoteSummary(userId: string, noteId: string, options: { length?: string }): Promise<string | null> {
  // This is a placeholder implementation
  // In a real implementation, this would use AI/ML services like Hugging Face Transformers.js
  const note = await getNoteById(userId, noteId);
  if (!note) {
    return null;
  }

  const content = stripHtmlTags(note.content);
  if (content.length < 100) {
    return 'Note is too short to summarize.';
  }

  // Simple extractive summary - take first few sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const summaryLength = options.length === 'short' ? 1 : options.length === 'detailed' ? 5 : 3;
  
  return sentences.slice(0, summaryLength).join('. ') + '.';
}