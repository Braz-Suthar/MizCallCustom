CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add setting to hosts table for enforcing one user one device
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS enforce_user_single_session BOOLEAN DEFAULT FALSE;

-- Create user_sessions table (similar to host_sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  device_label TEXT,
  device_name TEXT,
  model_name TEXT,
  platform TEXT,
  os_name TEXT,
  os_version TEXT,
  access_jti TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_sessions_unique_refresh UNIQUE (user_id, refresh_token)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_host ON user_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_access_jti ON user_sessions(access_jti);

-- Create user_session_requests table for pending approvals
CREATE TABLE IF NOT EXISTS user_session_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  device_name TEXT,
  model_name TEXT,
  platform TEXT,
  os_name TEXT,
  os_version TEXT,
  user_agent TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT REFERENCES hosts(id),
  CONSTRAINT user_session_requests_unique_pending UNIQUE (user_id, status) WHERE status = 'pending'
);

CREATE INDEX IF NOT EXISTS idx_user_session_requests_user ON user_session_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_session_requests_host ON user_session_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_user_session_requests_status ON user_session_requests(status);
