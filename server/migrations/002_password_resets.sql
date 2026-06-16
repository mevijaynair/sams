-- 002_password_resets.sql — tokens for email-based password reset / account setup

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash   TEXT PRIMARY KEY,          -- sha256 of the emailed token (raw token never stored)
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose      TEXT NOT NULL DEFAULT 'reset',  -- 'reset' | 'invite'
  expires_at   TEXT NOT NULL,
  used_at      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets(user_id);
