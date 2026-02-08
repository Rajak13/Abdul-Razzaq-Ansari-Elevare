const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse DATABASE_URL if provided
function parseDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: { rejectUnauthorized: false },
      };
    } catch (error) {
      console.error('Failed to parse DATABASE_URL:', error);
      return null;
    }
  }
  return null;
}

const parsedDbUrl = parseDatabaseUrl();

const pool = new Pool(
  parsedDbUrl || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'elevare_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  }
);

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    console.log(`📊 Database: ${parsedDbUrl?.database || process.env.DB_NAME}`);
    console.log(`🌐 Host: ${parsedDbUrl?.host || process.env.DB_HOST}`);

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Get migrations directory - check multiple locations
    let migrationsDir = path.join(__dirname, '../migrations');
    
    // If running from dist, try dist/db/migrations
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, 'dist/db/migrations');
    }

    // Try relative to current working directory
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(process.cwd(), 'migrations');
    }

    // Try one level up from backend
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '../../migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      console.error('❌ Migrations directory not found!');
      console.error('Tried locations:');
      console.error('  - ' + path.join(__dirname, '../migrations'));
      console.error('  - ' + path.join(__dirname, 'dist/db/migrations'));
      console.error('  - ' + path.join(process.cwd(), 'migrations'));
      console.error('  - ' + path.join(__dirname, '../../migrations'));
      process.exit(1);
    }

    console.log(`📁 Migrations directory: ${migrationsDir}`);

    // Get all migration files
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`📝 Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`\n🔄 Running migration: ${file}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        // Check if error is about table already existing
        if (error.code === '42P07') {
          console.log(`⏭️  Migration ${file} skipped (already applied)`);
        } else {
          console.error(`❌ Migration ${file} failed:`, error.message);
          // Continue with other migrations instead of stopping
        }
      }
    }

    console.log('\n✅ All migrations completed!');
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
