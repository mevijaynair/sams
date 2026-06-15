// migrations.js — SQL migration runner. Applies all pending migrations in order.
import { db } from './db.js';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

// Ensure schema_version table exists
function initVersionTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

// Get the current schema version (0 if not applied)
function getCurrentVersion() {
  initVersionTable();
  const result = db.prepare('SELECT MAX(version) as max_version FROM schema_version').get();
  return result?.max_version || 0;
}

// Run all pending migrations
export function runMigrations() {
  const currentVersion = getCurrentVersion();
  console.log(`Current schema version: ${currentVersion}`);

  // Read all migration files
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  let appliedCount = 0;
  for (const file of files) {
    const match = file.match(/^(\d+)_/);
    if (!match) {
      console.warn(`Skipping migration file with invalid name: ${file}`);
      continue;
    }

    const version = parseInt(match[1], 10);
    if (version <= currentVersion) {
      continue; // Already applied
    }

    try {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`Applying migration ${version} (${file})...`);

      // Wrap migration in transaction for atomicity
      db.exec('BEGIN TRANSACTION');
      try {
        // Execute the migration file (split by ; to handle multiple statements)
        const statements = sql.split(';').map(s => s.trim()).filter(s => s);
        for (const stmt of statements) {
          db.exec(stmt);
        }

        // Record the version
        db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
          version,
          new Date().toISOString()
        );

        db.exec('COMMIT');
        appliedCount++;
        console.log(`✓ Migration ${version} applied successfully`);
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }
    } catch (err) {
      console.error(`✗ Migration ${version} failed:`, err.message);
      throw err;
    }
  }

  console.log(`Migrations complete: ${appliedCount} applied, schema version now ${currentVersion + appliedCount}`);
}

// Migration status (for admin dashboard)
export function getMigrationStatus() {
  initVersionTable();
  const current = getCurrentVersion();
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  return {
    current,
    latest: Math.max(0, ...files.map(f => {
      const match = f.match(/^(\d+)_/);
      return match ? parseInt(match[1], 10) : 0;
    })),
    pending: files.filter(f => {
      const match = f.match(/^(\d+)_/);
      return match && parseInt(match[1], 10) > current;
    }).map(f => ({ name: f })),
  };
}
