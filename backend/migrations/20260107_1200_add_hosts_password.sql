-- Add password column to hosts (plaintext will be hashed at insert; keep nullable for existing rows)
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS password TEXT;

