-- 20251217_0001_ensure_dashboard_schema.sql
-- Ensure all required columns and indexes exist for dashboard functionality

-- Add enabled column to users if it doesn't exist
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add created_at column to users if it doesn't exist
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add status column to rooms if it doesn't exist
DO $$ BEGIN
  ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'started';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add created_at column to rooms if it doesn't exist  
DO $$ BEGIN
  ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Update existing records to have created_at if they don't
UPDATE users SET created_at = now() WHERE created_at IS NULL;
UPDATE rooms SET created_at = started_at WHERE created_at IS NULL;

-- Create indexes for better dashboard query performance
CREATE INDEX IF NOT EXISTS idx_users_host_id ON users(host_id);
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_started_at ON rooms(started_at);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);

-- Make created_at NOT NULL after populating
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN created_at SET NOT NULL;

