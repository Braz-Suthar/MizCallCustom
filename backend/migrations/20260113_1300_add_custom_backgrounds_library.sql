-- Create table to store all custom background images uploaded by hosts
-- Allows hosts to build a library of backgrounds and switch between them
CREATE TABLE IF NOT EXISTS custom_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT REFERENCES hosts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT custom_backgrounds_unique_url UNIQUE (url)
);

-- Add check constraint for owner (at least one of host_id must be set for now)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_backgrounds_owner_check'
  ) THEN
    ALTER TABLE custom_backgrounds
      ADD CONSTRAINT custom_backgrounds_owner_check CHECK (host_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_host ON custom_backgrounds(host_id);
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_uploaded_at ON custom_backgrounds(uploaded_at DESC);
