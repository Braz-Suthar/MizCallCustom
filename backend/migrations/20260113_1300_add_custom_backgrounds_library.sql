-- Create table to store all custom background images uploaded by hosts and users
-- Allows each to build their own library of backgrounds and switch between them
CREATE TABLE IF NOT EXISTS custom_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT REFERENCES hosts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT custom_backgrounds_unique_url UNIQUE (url),
  CONSTRAINT custom_backgrounds_owner_check CHECK (
    (host_id IS NOT NULL AND user_id IS NULL) OR 
    (host_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_host ON custom_backgrounds(host_id);
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_user ON custom_backgrounds(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_backgrounds_uploaded_at ON custom_backgrounds(uploaded_at DESC);
