-- 004_fixtures.sql — match fixtures / results per academy

CREATE TABLE IF NOT EXISTS fixtures (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  opponent     TEXT NOT NULL,
  match_date   TEXT NOT NULL,                    -- YYYY-MM-DD
  kickoff      TEXT,                             -- HH:MM (optional)
  venue        TEXT NOT NULL DEFAULT 'Home',     -- Home | Away | Neutral
  competition  TEXT,                             -- League | Friendly | Cup | Tournament
  age_group    TEXT,                             -- which squad plays
  sport        TEXT NOT NULL DEFAULT 'Football',
  status       TEXT NOT NULL DEFAULT 'Scheduled',-- Scheduled | Played | Cancelled
  our_score    INTEGER,                          -- filled once Played
  opp_score    INTEGER,
  notes        TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_date ON fixtures(tenant_id, match_date);
