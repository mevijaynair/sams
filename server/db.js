// db.js — SQLite connection, schema, and seed.
//
// Uses Node's built-in `node:sqlite` (Node >= 22.5) so there is nothing to
// install and the DB is a single file under data/. All table access goes
// through the repos/ layer; this file owns the connection and schema only,
// which keeps a future swap to Postgres contained to repos/ + this file.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = process.env.SAMS_DB_PATH || join(DATA_DIR, 'sams.db');

mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id                 TEXT PRIMARY KEY,
  tenant_id          TEXT NOT NULL REFERENCES tenants(id),
  name               TEXT NOT NULL,
  age_group          TEXT NOT NULL,
  eid_number         TEXT,
  eid_expiry         TEXT,
  billing_structure  TEXT NOT NULL DEFAULT 'Standard',
  monthly_fee        REAL NOT NULL DEFAULT 0,
  discount_note      TEXT,
  freeze_range       TEXT,
  payment_status     TEXT NOT NULL DEFAULT 'Due',
  last_payment_date  TEXT,
  account_status     TEXT NOT NULL DEFAULT 'Active',
  exit_reason        TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  recorded_at  TEXT NOT NULL,
  metrics      TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_eval_student ON evaluations(student_id);

CREATE TABLE IF NOT EXISTS attendance (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_date  TEXT NOT NULL,
  present       INTEGER NOT NULL DEFAULT 0,
  recorded_at   TEXT NOT NULL,
  UNIQUE(student_id, session_date)
);
CREATE INDEX IF NOT EXISTS idx_att_tenant_date ON attendance(tenant_id, session_date);
`;

export function initSchema() {
  db.exec(SCHEMA);
}

export function seed() {
  initSchema();
  const tenantCount = db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n;
  if (tenantCount > 0) {
    console.log('Seed skipped — tenants already exist.');
    return;
  }

  const insTenant = db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)');
  insTenant.run('ACAD_01', 'Apex Football Academy');
  insTenant.run('ACAD_02', 'Elite Strikers Club');

  const insStudent = db.prepare(`
    INSERT INTO students
      (id, tenant_id, name, age_group, eid_number, eid_expiry, billing_structure,
       monthly_fee, discount_note, freeze_range, payment_status, last_payment_date,
       account_status, exit_reason, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const now = new Date().toISOString();
  insStudent.run('s1', 'ACAD_01', 'Zayd Nair', 'U10-U13', '784-1980-1234567-1',
    '2027-12-31', 'Standard', 450, '', '', 'Paid', '2026-06-01', 'Active', '', now);
  insStudent.run('s2', 'ACAD_01', 'Ryan Al-Mansoori', 'U14-U18', '784-2008-7654321-2',
    '2026-05-15', 'Paused', 500, '', 'July-August', 'Due', '2026-04-01', 'Active', '', now);
  insStudent.run('s3', 'ACAD_02', 'Omar Haddad', 'U6-U9', '784-2018-1112223-3',
    '2028-01-20', 'Custom', 300, 'Sibling discount 20%', '', 'Overdue', '2026-03-15', 'Active', '', now);

  const insEval = db.prepare(`
    INSERT INTO evaluations (id, tenant_id, student_id, recorded_at, metrics)
    VALUES (?,?,?,?,?)
  `);
  insEval.run('e1', 'ACAD_01', 's1', now,
    JSON.stringify({ 'Passing Accuracy Metric (%)': '85%', '1v1 Technical Success Rate (%)': '78%' }));

  console.log('Seeded 2 tenants, 3 students, 1 evaluation.');
}

// Allow `node server/db.js --seed`
if (process.argv[1] && process.argv[1].endsWith('db.js') && process.argv.includes('--seed')) {
  seed();
  console.log(`DB ready at ${DB_PATH}`);
}
