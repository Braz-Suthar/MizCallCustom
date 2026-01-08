-- Add avatar_url column for users to store profile pictures
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

