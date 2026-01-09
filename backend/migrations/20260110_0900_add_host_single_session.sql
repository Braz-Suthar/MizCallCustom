-- Add single-session enforcement fields for hosts
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS enforce_single_session BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active_session_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS active_session_expires_at TIMESTAMP;
