ALTER TABLE hosts
  ALTER COLUMN enforce_single_session SET DEFAULT TRUE;

-- Ensure existing nulls default to on
UPDATE hosts
SET enforce_single_session = TRUE
WHERE enforce_single_session IS NULL;
