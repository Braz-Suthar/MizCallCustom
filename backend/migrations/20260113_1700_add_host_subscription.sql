-- Add subscription/membership fields to hosts table
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS membership_start_date TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS membership_end_date TIMESTAMP;

-- Set default end date for existing hosts (1 year from now)
UPDATE hosts 
SET membership_end_date = NOW() + INTERVAL '1 year'
WHERE membership_end_date IS NULL;
