-- SAMS multi-tenant SaaS schema — PostgreSQL (production target).
-- Isolation = academy_id on every tenant-scoped row + Row-Level Security.
-- Core player row is decoupled from Extension tables; Extensions are gated by
-- SaaS-level Feature Flags. Audit = append-only Delta Log (point-in-time replay).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────
-- Roles
-- ──────────────────────────────────────────────────────────────────────────
CREATE TYPE sams_role AS ENUM (
  'platform_owner',     -- global control: flags, schema upgrades, cross-tenant
  'support_admin',      -- read-only infra/config; NO player PII / EID
  'academy_super_admin',-- full control within one academy silo; exports, financials
  'coach_staff'         -- check-ins, age-scored performance, single entry; NO export
);

CREATE TYPE flag_scope AS ENUM ('global', 'academy');

-- ──────────────────────────────────────────────────────────────────────────
-- Tenants & identity
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE academies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sports      JSONB NOT NULL DEFAULT '["Football"]',
  status      TEXT NOT NULL DEFAULT 'active',     -- active | suspended
  plan        TEXT NOT NULL DEFAULT 'standard',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id     UUID REFERENCES academies(id),  -- NULL for platform roles
  role           sams_role NOT NULL,
  full_name      TEXT NOT NULL,
  email          CITEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  sport          TEXT,                            -- coach scoping
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_roles_have_no_academy CHECK (
    (role IN ('platform_owner','support_admin') AND academy_id IS NULL) OR
    (role IN ('academy_super_admin','coach_staff') AND academy_id IS NOT NULL)
  )
);
CREATE INDEX ON users (academy_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Feature flags: global catalog/defaults + per-academy overrides.
-- Effective(academy, key) = COALESCE(override.enabled, catalog.default_enabled)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE feature_flags (
  key              TEXT PRIMARY KEY,              -- e.g. 'eid_document_vault'
  description      TEXT,
  scope            flag_scope NOT NULL DEFAULT 'academy',
  default_enabled  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE academy_feature_flags (
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  key         TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (academy_id, key)
);

INSERT INTO feature_flags (key, description, scope, default_enabled) VALUES
  ('eid_document_vault', 'Store/verify Emirates ID documents', 'academy', false),
  ('financials',         'Fee plans & billing analytics',      'academy', true),
  ('performance_scoring','Age/sport performance matrices',     'academy', true);

-- ──────────────────────────────────────────────────────────────────────────
-- CORE table — always present, minimal non-sensitive player data.
-- Basic player ops keep working even with every Extension flag OFF.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE players (                            -- CORE
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  sport       TEXT NOT NULL,
  age_group   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',     -- active | exited
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON players (academy_id);
CREATE INDEX ON players (academy_id, sport);

-- ──────────────────────────────────────────────────────────────────────────
-- EXTENSION tables — 1:1 / 1:N with players, each gated by a feature flag.
-- ──────────────────────────────────────────────────────────────────────────

-- EID Document Vault (flag: eid_document_vault). Holds the sensitive PII.
CREATE TABLE player_eid_vault (                   -- EXTENSION
  player_id      UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  academy_id     UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  eid_number     TEXT,
  eid_expiry     DATE,
  document_uri   TEXT,                            -- object-store key for the scan
  verified       BOOLEAN NOT NULL DEFAULT false,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financials (flag: financials). Modular fee plan.
CREATE TABLE player_financials (                  -- EXTENSION
  player_id          UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  academy_id         UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  fee_plan_type      TEXT NOT NULL DEFAULT 'monthly',  -- monthly|per_session|package
  fee_rate           NUMERIC(10,2) NOT NULL DEFAULT 0,
  package_total      INT NOT NULL DEFAULT 0,
  package_remaining  INT NOT NULL DEFAULT 0,
  payment_status     TEXT NOT NULL DEFAULT 'due',
  freeze_range       TEXT
);

-- Performance scoring (flag: performance_scoring). Age/sport-specific JSON.
CREATE TABLE player_performance (                 -- EXTENSION
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  academy_id   UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metrics      JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX ON player_performance (player_id);

CREATE TABLE attendance (                         -- EXTENSION (core-ish, always on)
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  academy_id    UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  present       BOOLEAN NOT NULL DEFAULT false,
  recorded_by   UUID REFERENCES users(id),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, session_date)
);
CREATE INDEX ON attendance (academy_id, session_date);

-- ──────────────────────────────────────────────────────────────────────────
-- Append-only Delta Log — immutable audit trail for point-in-time rollback.
-- Replay before/after JSONB up to a timestamp to reconstruct any entity state.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE delta_log (
  seq         BIGSERIAL PRIMARY KEY,             -- monotonic ordering
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID REFERENCES users(id),
  actor_role  sams_role,
  academy_id  UUID,                              -- NULL for platform-level events
  entity      TEXT NOT NULL,                     -- 'players' | 'player_financials' | ...
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,                     -- INSERT | UPDATE | DELETE
  before      JSONB,                             -- NULL on INSERT
  after       JSONB                              -- NULL on DELETE
);
CREATE INDEX ON delta_log (entity, entity_id, seq);
CREATE INDEX ON delta_log (academy_id, occurred_at);

-- Enforce append-only: block UPDATE/DELETE on the audit trail.
CREATE OR REPLACE FUNCTION delta_log_is_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'delta_log is append-only';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER delta_log_no_update BEFORE UPDATE OR DELETE ON delta_log
  FOR EACH ROW EXECUTE FUNCTION delta_log_is_immutable();

-- Generic capture trigger -> writes a delta row for any audited table.
CREATE OR REPLACE FUNCTION capture_delta() RETURNS trigger AS $$
BEGIN
  INSERT INTO delta_log (actor_id, actor_role, academy_id, entity, entity_id, action, before, after)
  VALUES (
    NULLIF(current_setting('app.user_id', true), '')::uuid,
    NULLIF(current_setting('app.role', true), '')::sams_role,
    COALESCE(NEW.academy_id, OLD.academy_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delta_players   AFTER INSERT OR UPDATE OR DELETE ON players            FOR EACH ROW EXECUTE FUNCTION capture_delta();
CREATE TRIGGER trg_delta_fin       AFTER INSERT OR UPDATE OR DELETE ON player_financials  FOR EACH ROW EXECUTE FUNCTION capture_delta();
CREATE TRIGGER trg_delta_eid       AFTER INSERT OR UPDATE OR DELETE ON player_eid_vault   FOR EACH ROW EXECUTE FUNCTION capture_delta();
CREATE TRIGGER trg_delta_perf      AFTER INSERT OR UPDATE OR DELETE ON player_performance FOR EACH ROW EXECUTE FUNCTION capture_delta();

-- ──────────────────────────────────────────────────────────────────────────
-- Row-Level Security — tenant isolation enforced by the database itself.
-- App sets per-request GUCs: app.role, app.academy_id, app.user_id.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_role_name() RETURNS sams_role AS $$
  SELECT NULLIF(current_setting('app.role', true), '')::sams_role
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_academy() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.academy_id', true), '')::uuid
$$ LANGUAGE sql STABLE;

-- Tenant-scoped Extension/Core tables: platform_owner sees all; academy roles
-- see only their silo; support_admin is denied at the app layer for PII tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['players','player_financials','player_eid_vault','player_performance','attendance']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (
        current_role_name() = 'platform_owner'
        OR academy_id = current_academy()
      );$p$, t);
  END LOOP;
END $$;
