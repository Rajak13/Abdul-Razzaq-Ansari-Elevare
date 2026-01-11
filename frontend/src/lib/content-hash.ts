import { Note } from '@/types/note';

/**
 * Generate SHA-256 hash of note content for change detection (async version)
 * @param content The note content to hash
 * @returns Promise that resolves to SHA-256 hash as hexadecimal string
 */
export async function generateContentHash(content: string): Promise<string> {
  // Normalize content by trimming whitespace to avoid hash changes from formatting
  const normalizedContent = content.trim();
  
  try {
    // Use Web Crypto API for SHA-256 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback to simple hash if crypto API is not available
    return simpleHash(normalizedContent);
  }
}

/**
 * Synchronous version of generateContentHash for cases where async is not suitable
 * Uses the same algorithm as the backend for consistency
 * @param content The note content to hash
 * @returns SHA-256 hash as hexadecimal string (or simple hash as fallback)
 */
export function generateContentHashSync(content: string): string {
  const normalizedContent = content.trim();
  
  // Try to use crypto API synchronously if available (Node.js environment)
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(normalizedContent).digest('hex');
    } catch {
      // Fall back to simple hash
    }
  }
  
  // For browser environments, use simple hash (should match backend when possible)
  return simpleHash(normalizedContent);
}

/**
 * Simple hash function fallback for environments without crypto API
 * @param str String to hash
 * @returns Simple hash as hexadecimal string
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if a note's summary is outdated based on content changes
 * @param note The note to check
 * @returns true if summary is outdated, false otherwise
 */
export function isSummaryOutdated(note: Note): boolean {
  // If there's no summary or no stored hash, consider it not outdated
  if (!note.summary || !note.content_hash) {
    return false;
  }
  
  // If the note was just created (within the last 30 seconds), don't consider it outdated
  // This prevents false positives when there are minor hash differences between frontend/backend
  if (note.created_at) {
    const createdAt = new Date(note.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    const thirtySeconds = 30 * 1000;
    
    if (timeDiff < thirtySeconds) {
      console.log('🕒 Content Hash: Note was just created, skipping staleness check');
      return false;
    }
  }
  
  // If the summary was just generated (within the last 30 seconds), don't consider it outdated
  if (note.summary_generated_at) {
    const generatedAt = new Date(note.summary_generated_at);
    const now = new Date();
    const timeDiff = now.getTime() - generatedAt.getTime();
    const thirtySeconds = 30 * 1000;
    
    if (timeDiff < thirtySeconds) {
      console.log('🕒 Content Hash: Summary was just generated, skipping staleness check');
      return false;
    }
  }
  
  // Generate current content hash and compare with stored hash
  const currentHash = generateContentHashSync(note.content);
  const isOutdated = currentHash !== note.content_hash;
  
  console.log('🔍 Content Hash: Staleness check', {
    noteId: note.id,
    currentHash: currentHash.substring(0, 8) + '...',
    storedHash: note.content_hash?.substring(0, 8) + '...',
    isOutdated,
    contentLength: note.content?.length || 0
  });
  
  return isOutdated;
}

/**
 * Check if a note needs summary regeneration based on content changes
 * @param note The note to check
 * @returns true if summary should be regenerated, false otherwise
 */
export function shouldRegenerateSummary(note: Note): boolean {
  // If there's no summary, it should be generated
  if (!note.summary) {
    return true;
  }
  
  // If content has changed since summary was generated, it should be regenerated
  return isSummaryOutdated(note);
}

/**
 * Get staleness indicator message for UI display
 * @param note The note to check
 * @returns Staleness message or null if summary is current
 */
export function getSummaryStalnessMessage(note: Note): string | null {
  if (!note.summary) {
    return null;
  }
  
  if (isSummaryOutdated(note)) {
    const generatedAt = note.summary_generated_at 
      ? new Date(note.summary_generated_at).toLocaleDateString()
      : 'unknown date';
    return `Summary may be outdated. Content changed since ${generatedAt}.`;
  }
  
  return null;
}

/**
 * Create updated note data with new content hash
 * @param note The note being updated
 * @param newContent The new content
 * @returns Partial note data with updated hash
 */
export function createNoteUpdateWithHash(note: Note, newContent: string): Partial<Note> {
  const contentHash = generateContentHashSync(newContent);
  
  return {
    content: newContent,
    content_hash: contentHash,
    // Clear summary fields if content changed significantly
    ...(contentHash !== note.content_hash && {
      summary: undefined,
      summary_generated_at: undefined,
      summary_model: undefined
    })
  };
}