-- Create table for performance metrics
CREATE TABLE IF NOT EXISTS api_performance_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  duration_ms INT NOT NULL,
  status_code INT NOT NULL,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_perf_timestamp ON api_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_perf_endpoint ON api_performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_perf_created_at ON api_performance_metrics(created_at DESC);

-- Create retention policy function (keep last 7 days)
CREATE OR REPLACE FUNCTION delete_old_performance_metrics() RETURNS void AS $$
BEGIN
  DELETE FROM api_performance_metrics WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
