import pool from './connection';
import { QueryResult, QueryResultRow } from 'pg';
import logger from '../utils/logger';

/**
 * Secure database query wrapper with SQL injection prevention
 * Always uses parameterized queries
 */

export interface SecureQueryOptions {
  logQuery?: boolean;
  timeout?: number;
}

/**
 * Execute a secure parameterized query
 * Prevents SQL injection by using prepared statements
 */
export async function secureQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
  options: SecureQueryOptions = {}
): Promise<QueryResult<T>> {
  const { logQuery = false, timeout = 30000 } = options;

  // Validate that query uses parameterized format
  if (params && params.length > 0) {
    const paramPlaceholders = text.match(/\$\d+/g);
    const expectedParams = paramPlaceholders ? paramPlaceholders.length : 0;
    
    if (expectedParams !== params.length) {
      logger.error('Parameter count mismatch', {
        expected: expectedParams,
        provided: params.length,
        query: text,
      });
      throw new Error('Parameter count mismatch in query');
    }
  }

  // Check for potential SQL injection patterns in query text
  const dangerousPatterns = [
    /;\s*DROP/gi,
    /;\s*DELETE\s+FROM/gi,
    /;\s*UPDATE\s+.*\s+SET/gi,
    /UNION\s+SELECT/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      logger.error('Dangerous SQL pattern detected', { query: text });
      throw new Error('Dangerous SQL pattern detected');
    }
  }

  if (logQuery) {
    logger.debug('Executing query', {
      query: text,
      paramCount: params?.length || 0,
    });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Set statement timeout
      await client.query(`SET statement_timeout = ${timeout}`);
      
      const result = await client.query<T>(text, params);
      
      if (logQuery) {
        logger.debug('Query executed successfully', {
          rowCount: result.rowCount,
        });
      }
      
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database query error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: text,
      paramCount: params?.length || 0,
    });
    throw error;
  }
}

/**
 * Execute a secure transaction
 */
export async function secureTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Safely escape identifiers (table names, column names)
 * Use only when dynamic identifiers are absolutely necessary
 */
export function escapeIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error('Invalid identifier format');
  }
  
  // Wrap in double quotes to preserve case and prevent injection
  return `"${identifier}"`;
}

/**
 * Build a safe WHERE clause with parameterized values
 */
export function buildWhereClause(
  conditions: Record<string, any>,
  startIndex: number = 1
): { clause: string; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      const safeKey = escapeIdentifier(key);
      
      if (Array.isArray(value)) {
        // Handle IN clause
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        clauses.push(`${safeKey} IN (${placeholders})`);
        values.push(...value);
      } else {
        clauses.push(`${safeKey} = $${paramIndex++}`);
        values.push(value);
      }
    }
  }

  const clause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { clause, values };
}

/**
 * Build a safe ORDER BY clause
 */
export function buildOrderByClause(
  orderBy: string,
  direction: 'ASC' | 'DESC' = 'ASC'
): string {
  const safeColumn = escapeIdentifier(orderBy);
  const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC';
  return `ORDER BY ${safeColumn} ${safeDirection}`;
}

/**
 * Build a safe LIMIT and OFFSET clause
 */
export function buildPaginationClause(
  limit: number,
  offset: number = 0
): { clause: string; values: number[] } {
  const safeLimit = Math.min(Math.max(1, limit), 1000); // Max 1000 records
  const safeOffset = Math.max(0, offset);
  
  return {
    clause: `LIMIT $1 OFFSET $2`,
    values: [safeLimit, safeOffset],
  };
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize search query for LIKE operations
 */
export function sanitizeSearchQuery(query: string): string {
  // Escape special characters for LIKE queries
  return query
    .replace(/[%_\\]/g, '\\$&') // Escape LIKE wildcards
    .trim()
    .substring(0, 100);
}
