-- Add enforce_single_device column to users table
-- This allows per-user override of the host's enforce_user_single_session setting
-- NULL = inherit from host setting
-- TRUE = force single device for this user
-- FALSE = allow multiple devices for this user

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS enforce_single_device BOOLEAN DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_enforce_single_device ON users(enforce_single_device);
