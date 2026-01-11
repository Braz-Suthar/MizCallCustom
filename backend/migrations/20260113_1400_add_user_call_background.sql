-- Add call background to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS call_background_url TEXT DEFAULT NULL;

-- Update custom_backgrounds table to support users
-- Remove the constraint that requires EITHER user_id OR host_id
ALTER TABLE custom_backgrounds
  DROP CONSTRAINT IF EXISTS custom_backgrounds_user_or_host;

-- Add user_id column
ALTER TABLE custom_backgrounds
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Add new constraint: must have EITHER host_id OR user_id (not both, not neither)
ALTER TABLE custom_backgrounds
  ADD CONSTRAINT custom_backgrounds_owner_check CHECK (
    (host_id IS NOT NULL AND user_id IS NULL) OR 
    (host_id IS NULL AND user_id IS NOT NULL)
  );

-- Add index for user backgrounds
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_user ON custom_backgrounds(user_id);
