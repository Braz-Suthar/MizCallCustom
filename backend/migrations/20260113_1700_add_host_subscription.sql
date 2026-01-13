-- Add subscription/membership fields to hosts table
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Trial',
  ADD COLUMN IF NOT EXISTS membership_start_date TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS membership_end_date TIMESTAMP;

-- Set default trial period for existing hosts (7 days from now)
UPDATE hosts 
SET membership_type = 'Trial',
    membership_start_date = NOW(),
    membership_end_date = NOW() + INTERVAL '7 days'
WHERE membership_end_date IS NULL;
