ALTER TABLE hosts
  ALTER COLUMN enforce_single_session SET DEFAULT FALSE;

-- Ensure nulls default to multi-session (off means allow multiple)
UPDATE hosts
SET enforce_single_session = FALSE
WHERE enforce_single_session IS NULL;
