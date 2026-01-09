-- Add two_factor_enabled flag for hosts
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
