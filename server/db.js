// db.js — SQLite connection, schema, and seed.
//
// Uses Node's built-in `node:sqlite` (Node >= 22.5) so there is nothing to
// install and the DB is a single file under data/. All table access goes
// through the repos/ layer; this file owns the connection and schema only.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { hashPassword } from './auth.js';
import { runMigrations } from './migrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = process.env.SAMS_DB_PATH || join(DATA_DIR, 'sams.db');

mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  sports  TEXT NOT NULL DEFAULT '["Football"]'   -- JSON array of sports the academy runs
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT REFERENCES tenants(id),      -- NULL for super_admin
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL,                    -- super_admin | admin | coach
  sport          TEXT,                             -- coaches: their sport
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id                 TEXT PRIMARY KEY,
  tenant_id          TEXT NOT NULL REFERENCES tenants(id),
  name               TEXT NOT NULL,
  sport              TEXT NOT NULL DEFAULT 'Football',
  age_group          TEXT NOT NULL,
  eid_number         TEXT,
  eid_expiry         TEXT,
  -- modular fee plan
  fee_plan_type      TEXT NOT NULL DEFAULT 'monthly', -- monthly | per_session | package
  fee_rate           REAL NOT NULL DEFAULT 0,         -- monthly amount, OR per-session rate, OR package price
  package_sessions   INTEGER NOT NULL DEFAULT 0,      -- package: total sessions purchased
  package_remaining  INTEGER NOT NULL DEFAULT 0,      -- package: sessions left
  freeze_range       TEXT,
  payment_status     TEXT NOT NULL DEFAULT 'Due',
  last_payment_date  TEXT,
  account_status     TEXT NOT NULL DEFAULT 'Active',
  exit_reason        TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_sport ON students(tenant_id, sport);

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

-- Parent/Guardian management (1-to-many: one parent can have multiple children)
CREATE TABLE IF NOT EXISTS parents (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  relationship   TEXT NOT NULL DEFAULT 'Parent',  -- Parent | Guardian | Emergency Contact
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parents_tenant ON parents(tenant_id);

-- Junction: link students to parents (many-to-many)
CREATE TABLE IF NOT EXISTS student_parents (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id      TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  is_primary     INTEGER NOT NULL DEFAULT 0,  -- Primary contact for communications
  created_at     TEXT NOT NULL,
  UNIQUE(student_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_stud_parent ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_students ON student_parents(parent_id);

-- Audit log for super_admin actions (track all changes)
CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT REFERENCES tenants(id),  -- NULL for super_admin actions on tenants
  actor_id       TEXT NOT NULL REFERENCES users(id),
  actor_role     TEXT NOT NULL,                 -- super_admin | super_super_admin | admin | coach
  entity_type    TEXT NOT NULL,                 -- students | parents | users | tenants | etc.
  entity_id      TEXT NOT NULL,
  action         TEXT NOT NULL,                 -- create | update | delete | export
  before_state   TEXT,                          -- JSON snapshot of previous state
  after_state    TEXT,                          -- JSON snapshot of new state
  reason         TEXT,                          -- why the action was taken
  ip_address     TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
`;

export function initSchema() {
  // Run migrations to set up or upgrade the database schema
  runMigrations();
}

export function seed() {
  initSchema();
  const tenantCount = db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n;
  if (tenantCount > 0) {
    console.log('Seed skipped — data already exists.');
    return;
  }
  // In production, don't auto-seed demo accounts. Admins must create real accounts via the UI.
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: skipping demo data seed.');
    return;
  }
  const now = new Date().toISOString();

  // Academies are sport-specific. Two single-sport academies (the common case)
  // and one multi-sport club to show the platform accommodates several sports.
  const insTenant = db.prepare('INSERT INTO tenants (id, name, sports) VALUES (?, ?, ?)');
  insTenant.run('ACAD_01', 'Apex Football Academy', JSON.stringify(['Football']));
  insTenant.run('ACAD_02', 'Royal Cricket Academy', JSON.stringify(['Cricket']));
  insTenant.run('ACAD_03', 'Skyline Sports Club', JSON.stringify(['Football', 'Basketball', 'Badminton']));

  // --- users (dev passwords are intentionally simple) ---
  const insUser = db.prepare(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role, sport, active, created_at)
    VALUES (?,?,?,?,?,?,?,1,?)
  `);
  const mk = (id, tenant, name, email, pass, role, sport) =>
    insUser.run(id, tenant, name, email, hashPassword(pass), role, sport, now);

  mk('u_super', null, 'System Owner', 'super@sams.dev', 'super123', 'super_admin', null);
  mk('u_admin1', 'ACAD_01', 'Apex Admin', 'admin@apex.dev', 'admin123', 'admin', null);
  mk('u_coach_fb', 'ACAD_01', 'Coach Diego', 'football@apex.dev', 'coach123', 'coach', 'Football');
  mk('u_admin2', 'ACAD_02', 'Royal Admin', 'admin@royal.dev', 'admin123', 'admin', null);
  mk('u_coach_ck', 'ACAD_02', 'Coach Imran', 'cricket@royal.dev', 'coach123', 'coach', 'Cricket');
  mk('u_admin3', 'ACAD_03', 'Skyline Admin', 'admin@skyline.dev', 'admin123', 'admin', null);
  mk('u_coach_bb', 'ACAD_03', 'Coach Marcus', 'basketball@skyline.dev', 'coach123', 'coach', 'Basketball');

  // --- students (each student's sport is one the academy actually runs) ---
  const insStudent = db.prepare(`
    INSERT INTO students
      (id, tenant_id, name, sport, age_group, eid_number, eid_expiry, fee_plan_type, fee_rate,
       package_sessions, package_remaining, freeze_range, payment_status, last_payment_date,
       account_status, exit_reason, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  // Apex Football Academy (single-sport)
  insStudent.run('s1', 'ACAD_01', 'Zayd Nair', 'Football', 'U10-U13', '784-1980-1234567-1',
    '2027-12-31', 'monthly', 450, 0, 0, '', 'Paid', '2026-06-01', 'Active', '', now);
  insStudent.run('s2', 'ACAD_01', 'Ryan Al-Mansoori', 'Football', 'U14-U18', '784-2008-7654321-2',
    '2026-05-15', 'per_session', 60, 0, 0, 'July-August', 'Due', '2026-04-01', 'Active', '', now);
  insStudent.run('s3', 'ACAD_01', 'Sami Okafor', 'Football', 'U6-U9', '784-2016-9990001-6',
    '2028-02-01', 'monthly', 400, 0, 0, '', 'Paid', '2026-06-02', 'Active', '', now);
  // Royal Cricket Academy (single-sport)
  insStudent.run('s4', 'ACAD_02', 'Aarav Sharma', 'Cricket', 'U10-U13', '784-2014-2223334-4',
    '2028-03-10', 'package', 800, 16, 11, '', 'Paid', '2026-05-20', 'Active', '', now);
  insStudent.run('s5', 'ACAD_02', 'Yusuf Khan', 'Cricket', 'U14-U18', '784-2009-4445556-7',
    '2026-07-01', 'monthly', 500, 0, 0, '', 'Overdue', '2026-03-15', 'Active', '', now);
  // Skyline Sports Club (multi-sport)
  insStudent.run('s6', 'ACAD_03', 'Leah Court', 'Basketball', 'U14-U18', '784-2010-5556667-5',
    '2026-08-01', 'monthly', 400, 0, 0, '', 'Due', '2026-04-15', 'Active', '', now);
  insStudent.run('s7', 'ACAD_03', 'Omar Haddad', 'Badminton', 'U6-U9', '784-2018-1112223-3',
    '2028-01-20', 'package', 500, 10, 3, '', 'Due', '2026-04-10', 'Active', '', now);
  insStudent.run('s8', 'ACAD_03', 'Diego Reyes', 'Football', 'U10-U13', '784-2015-7778889-8',
    '2027-11-11', 'monthly', 450, 0, 0, '', 'Paid', '2026-06-01', 'Active', '', now);

  const insEval = db.prepare(`
    INSERT INTO evaluations (id, tenant_id, student_id, recorded_at, metrics) VALUES (?,?,?,?,?)
  `);
  insEval.run('e1', 'ACAD_01', 's1', now,
    JSON.stringify({ passing_accuracy: '85', one_v_one_success: '78', sprint_counts: '14' }));

  console.log('Seeded 3 tenants, 7 users, 8 students.');
}

// Allow `node server/db.js --seed`
if (process.argv[1] && process.argv[1].endsWith('db.js') && process.argv.includes('--seed')) {
  seed();
  console.log(`DB ready at ${DB_PATH}`);
}
