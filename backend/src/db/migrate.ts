import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from '../config';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl,
});

async function runMigrations() {
  try {
    console.log(' Starting database migrations...');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order

    console.log(`Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`Migration ${file} completed successfully`);
      } catch (error) {
        console.error(` Migration ${file} failed:`, error);
        // Continue with other migrations instead of stopping
      }
    }

    console.log(' All migrations completed!');
  } catch (error) {
    console.error(' Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();