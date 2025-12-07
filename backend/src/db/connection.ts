import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from '../config';
import logger from '../utils/logger';

// Create PostgreSQL connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Pool error handler
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

// Pool connection handler
pool.on('connect', () => {
  logger.info('New PostgreSQL client connected to the pool');
});

// Pool removal handler
pool.on('remove', () => {
  logger.info('PostgreSQL client removed from the pool');
});

/**
 * Execute a query with the pool
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

/**
 * Check database connection health
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection healthy', { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('PostgreSQL pool closed');
  } catch (error) {
    logger.error('Error closing PostgreSQL pool', error);
    throw error;
  }
}

export default pool;
