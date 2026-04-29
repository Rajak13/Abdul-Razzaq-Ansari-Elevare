import pool from '../db/connection';
import crypto from 'crypto';

export interface NoteShare {
  id: string;
  note_id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  expires_at: Date | null;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface SharedNoteData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  summary: string | null;
  created_at: Date;
  updated_at: Date;
  author_name: string;
  folder_name: string | null;
  folder_color: string | null;
}

/**
 * Generate a secure random token for sharing
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create a new share link for a note
 */
export async function createNoteShare(
  noteId: string,
  userId: string,
  expiresInDays?: number
): Promise<NoteShare> {
  const client = await pool.connect();
  
  try {
    // Verify the note belongs to the user
    const noteCheck = await client.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, userId]
    );
    
    if (noteCheck.rows.length === 0) {
      throw new Error('Note not found or access denied');
    }
    
    // Check if an active share already exists
    const existingShare = await client.query(
      `SELECT * FROM note_shares 
       WHERE note_id = $1 AND user_id = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [noteId, userId]
    );
    
    if (existingShare.rows.length > 0) {
      return existingShare.rows[0];
    }
    
    // Generate unique token
    let shareToken = generateShareToken();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 5) {
      const tokenCheck = await client.query(
        'SELECT id FROM note_shares WHERE share_token = $1',
        [shareToken]
      );
      
      if (tokenCheck.rows.length === 0) {
        isUnique = true;
      } else {
        shareToken = generateShareToken();
        attempts++;
      }
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique share token');
    }
    
    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Create the share
    const result = await client.query(
      `INSERT INTO note_shares (note_id, user_id, share_token, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [noteId, userId, shareToken, expiresAt]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get a shared note by token (public access)
 */
export async function getSharedNote(shareToken: string): Promise<SharedNoteData | null> {
  const client = await pool.connect();
  
  try {
    // Get the share and verify it's valid
    const shareResult = await client.query(
      `SELECT ns.*, n.title, n.content, n.tags, n.summary, n.created_at, n.updated_at,
              u.name as author_name, u.email as author_email,
              nf.name as folder_name, nf.color as folder_color
       FROM note_shares ns
       JOIN notes n ON ns.note_id = n.id
       JOIN users u ON n.user_id = u.id
       LEFT JOIN note_folders nf ON n.folder_id = nf.id
       WHERE ns.share_token = $1 
         AND ns.is_active = true
         AND (ns.expires_at IS NULL OR ns.expires_at > NOW())`,
      [shareToken]
    );
    
    if (shareResult.rows.length === 0) {
      return null;
    }
    
    const row = shareResult.rows[0];
    
    // Increment view count
    await client.query(
      'UPDATE note_shares SET view_count = view_count + 1 WHERE share_token = $1',
      [shareToken]
    );
    
    return {
      id: row.note_id,
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      summary: row.summary || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_name: row.author_name,
      folder_name: row.folder_name,
      folder_color: row.folder_color,
    };
  } finally {
    client.release();
  }
}

/**
 * Get all shares for a note
 */
export async function getNoteShares(noteId: string, userId: string): Promise<NoteShare[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM note_shares 
       WHERE note_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [noteId, userId]
    );
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Deactivate a share link
 */
export async function deactivateShare(shareId: string, userId: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `UPDATE note_shares 
       SET is_active = false 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [shareId, userId]
    );
    
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

/**
 * Delete a share link
 */
export async function deleteShare(shareId: string, userId: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'DELETE FROM note_shares WHERE id = $1 AND user_id = $2 RETURNING id',
      [shareId, userId]
    );
    
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

/**
 * Get share statistics for a user
 */
export async function getShareStats(userId: string): Promise<{
  total_shares: number;
  active_shares: number;
  total_views: number;
}> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
         COUNT(*) as total_shares,
         COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_shares,
         COALESCE(SUM(view_count), 0) as total_views
       FROM note_shares
       WHERE user_id = $1`,
      [userId]
    );
    
    return {
      total_shares: parseInt(result.rows[0].total_shares),
      active_shares: parseInt(result.rows[0].active_shares),
      total_views: parseInt(result.rows[0].total_views),
    };
  } finally {
    client.release();
  }
}
