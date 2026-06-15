-- 001_init.sql — Baseline schema for SAMS

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  sports  TEXT NOT NULL DEFAULT '["Football"]'
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT REFERENCES tenants(id),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL,
  sport          TEXT,
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
  fee_plan_type      TEXT NOT NULL DEFAULT 'monthly',
  fee_rate           REAL NOT NULL DEFAULT 0,
  package_sessions   INTEGER NOT NULL DEFAULT 0,
  package_remaining  INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS parents (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  relationship   TEXT NOT NULL DEFAULT 'Parent',
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_parents (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id    TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  UNIQUE(student_id, parent_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT REFERENCES tenants(id),
  actor_id       TEXT NOT NULL DEFAULT 'system',
  actor_role     TEXT NOT NULL DEFAULT 'system',
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL,
  action         TEXT NOT NULL,
  before_state   TEXT,
  after_state    TEXT,
  reason         TEXT,
  ip_address     TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
