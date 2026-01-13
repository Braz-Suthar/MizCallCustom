-- Create table for backup history
CREATE TABLE IF NOT EXISTS database_backups (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  triggered_by TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
