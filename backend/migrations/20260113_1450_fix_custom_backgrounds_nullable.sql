-- Fix custom_backgrounds table if it was created with NOT NULL constraint on host_id
-- This handles cases where the old migration ran before we updated it

-- Make host_id nullable
ALTER TABLE custom_backgrounds
  ALTER COLUMN host_id DROP NOT NULL;

-- Ensure the proper constraint exists
DO $$ 
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_backgrounds_owner_check'
  ) THEN
    ALTER TABLE custom_backgrounds DROP CONSTRAINT custom_backgrounds_owner_check;
  END IF;
  
  -- Add correct constraint
  ALTER TABLE custom_backgrounds
    ADD CONSTRAINT custom_backgrounds_owner_check CHECK (
      (host_id IS NOT NULL AND user_id IS NULL) OR 
      (host_id IS NULL AND user_id IS NOT NULL)
    );
END $$;
