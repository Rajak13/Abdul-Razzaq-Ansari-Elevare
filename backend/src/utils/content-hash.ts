import crypto from 'crypto';
import { Note } from '../types/note';

/**
 * Generate SHA-256 hash of note content for change detection
 * @param content The note content to hash
 * @returns SHA-256 hash as hexadecimal string
 */
export function generateContentHash(content: string): string {
  // Normalize content by trimming whitespace to avoid hash changes from formatting
  const normalizedContent = content.trim();
  
  // Use Node.js crypto module for SHA-256 hashing
  return crypto.createHash('sha256').update(normalizedContent).digest('hex');
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
  
  // Generate current content hash and compare with stored hash
  const currentHash = generateContentHash(note.content);
  return currentHash !== note.content_hash;
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
 * Get staleness indicator message for API responses
 * @param note The note to check
 * @returns Staleness information object or null if summary is current
 */
export function getSummaryStalnessInfo(note: Note): { 
  isOutdated: boolean; 
  message?: string; 
  generatedAt?: Date 
} | null {
  if (!note.summary) {
    return null;
  }
  
  const isOutdated = isSummaryOutdated(note);
  
  return {
    isOutdated,
    message: isOutdated ? 'Summary may be outdated due to content changes' : undefined,
    generatedAt: note.summary_generated_at
  };
}

/**
 * Create note data with content hash for database operations
 * @param noteData The note data to process
 * @returns Note data with content hash
 */
export function addContentHashToNote<T extends { content: string }>(noteData: T): T & { content_hash: string } {
  return {
    ...noteData,
    content_hash: generateContentHash(noteData.content)
  };
}

/**
 * Update note with new summary and metadata
 * @param note The existing note
 * @param summary The generated summary
 * @param model The model used for generation
 * @returns Updated note data
 */
export function updateNoteWithSummary(
  note: Note, 
  summary: string, 
  model: string = 'PEGASUS'
): Partial<Note> {
  return {
    summary,
    summary_generated_at: new Date(),
    summary_model: model,
    content_hash: generateContentHash(note.content)
  };
}