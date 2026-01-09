CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS host_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  device_label TEXT,
  access_jti TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT host_sessions_unique_refresh UNIQUE (host_id, refresh_token)
);

CREATE INDEX IF NOT EXISTS idx_host_sessions_host ON host_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_host_sessions_access_jti ON host_sessions(access_jti);
