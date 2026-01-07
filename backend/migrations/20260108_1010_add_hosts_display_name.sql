-- Add display_name column to hosts for storing full name separately from login email
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS display_name TEXT;

