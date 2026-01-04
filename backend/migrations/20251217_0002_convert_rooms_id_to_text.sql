-- 20251217_0002_convert_rooms_id_to_text.sql
-- Convert rooms.id from UUID to TEXT to match other tables

-- Change rooms.id column type to TEXT
ALTER TABLE rooms ALTER COLUMN id TYPE TEXT USING id::text;

-- Ensure clips table also uses TEXT for room references if it exists
DO $$ BEGIN
  ALTER TABLE clips ALTER COLUMN meeting_id TYPE TEXT USING meeting_id::text;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

-- Ensure recordings table uses TEXT for room references if it exists  
DO $$ BEGIN
  ALTER TABLE recordings ALTER COLUMN meeting_id TYPE TEXT USING meeting_id::text;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

