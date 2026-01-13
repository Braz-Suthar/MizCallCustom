-- Create table for system logs
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level TEXT NOT NULL,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  host_id TEXT,
  user_id TEXT,
  admin_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- Create retention policy function (optional - delete logs older than 30 days)
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS void AS $$
BEGIN
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
