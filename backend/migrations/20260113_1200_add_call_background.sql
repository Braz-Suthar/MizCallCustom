-- Add call background image URL to hosts table
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS call_background_url TEXT DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_hosts_call_background ON hosts(call_background_url) WHERE call_background_url IS NOT NULL;
