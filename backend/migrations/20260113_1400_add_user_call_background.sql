-- Add call background column to users table
-- This migration is now simplified since custom_backgrounds table
-- already supports users from the 1300 migration

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS call_background_url TEXT DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_call_background ON users(call_background_url) WHERE call_background_url IS NOT NULL;
