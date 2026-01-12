-- Create table to store daily statistics snapshots
CREATE TABLE IF NOT EXISTS stats_history (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_hosts INT DEFAULT 0,
  active_hosts INT DEFAULT 0,
  total_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  total_calls INT DEFAULT 0,
  active_calls INT DEFAULT 0,
  total_recordings INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stats_history_date ON stats_history(date DESC);

-- Insert current stats as today's snapshot (if not exists)
INSERT INTO stats_history (date, total_hosts, total_users, total_calls)
SELECT 
  CURRENT_DATE,
  (SELECT COUNT(*) FROM hosts),
  (SELECT COUNT(*) FROM users),
  (SELECT COUNT(*) FROM rooms)
ON CONFLICT (date) DO NOTHING;
