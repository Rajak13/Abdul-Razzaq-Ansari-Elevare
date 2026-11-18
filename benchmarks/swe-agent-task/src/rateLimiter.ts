import { DatabaseSync } from 'node:sqlite';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  dbPath?: string; // ':memory:' or file path on disk
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface IRateLimiter {
  checkAndRecord(key: string, endpoint: string, ip: string, now?: number): RateLimitResult;
  pruneExpired(now?: number): number;
  close(): void;
}

/**
 * SQLite-Backed Sliding-Window Rate Limiter
 * Provides persistent rolling-window rate limiting and security audit logging.
 */
export class SQLiteSlidingWindowRateLimiter implements IRateLimiter {
  private db: DatabaseSync;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    const dbPath = config.dbPath || ':memory:';
    this.db = new DatabaseSync(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // WAL mode for high concurrency
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // Ignored for in-memory databases
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        ip TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time 
      ON rate_limit_events (key, timestamp);
    `);
  }

  /**
   * Check if a request is allowed under the rolling sliding-window
   * and record the event if quota remains.
   */
  public checkAndRecord(key: string, endpoint: string, ip: string, now: number = Date.now()): RateLimitResult {
    try {
      const windowStart = now - this.config.windowMs;

      // 1. Query all timestamps in current sliding window
      const countStmt = this.db.prepare(`
        SELECT timestamp 
        FROM rate_limit_events 
        WHERE key = ? AND timestamp > ?
        ORDER BY timestamp ASC
      `);
      const rows = countStmt.all(key, windowStart) as { timestamp: number }[];
      const count = rows.length;

      // 2. If quota exceeded, calculate accurate Retry-After header
      if (count >= this.config.maxRequests) {
        const oldestTimestamp = rows[0].timestamp;
        const msUntilOldestExpires = (oldestTimestamp + this.config.windowMs) - now;
        const retryAfterSeconds = Math.max(1, Math.ceil(msUntilOldestExpires / 1000));

        return {
          allowed: false,
          limit: this.config.maxRequests,
          remaining: 0,
          retryAfterSeconds,
        };
      }

      // 3. Quota available: Record this request
      const insertStmt = this.db.prepare(`
        INSERT INTO rate_limit_events (key, endpoint, ip, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(key, endpoint, ip, now);

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - count - 1),
      };
    } catch (err) {
      // Fail-open principle: Do not bring down services if rate limiter fails
      console.error('[RateLimiter] Database check failed, failing open:', err);
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: 1,
      };
    }
  }

  /**
   * Prune events older than 2x the rolling window to prevent disk bloat
   */
  public pruneExpired(now: number = Date.now()): number {
    try {
      const retentionThreshold = now - (this.config.windowMs * 2);
      const deleteStmt = this.db.prepare(`
        DELETE FROM rate_limit_events 
        WHERE timestamp < ?
      `);
      const result = deleteStmt.run(retentionThreshold);
      return Number(result.changes);
    } catch (err) {
      console.error('[RateLimiter] Prune failed:', err);
      return 0;
    }
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // Already closed
    }
  }
}
