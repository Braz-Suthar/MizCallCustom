-- Switch host and user identifiers to prefixed 6-digit strings (Hxxxxxx/Uxxxxxx)
-- and propagate to dependent tables.

-- Drop foreign keys that depend on the type
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_host_id_fkey;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_host_id_fkey;
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_host_id_fkey;
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_user_id_fkey;
ALTER TABLE recordings DROP CONSTRAINT IF EXISTS recordings_host_id_fkey;
ALTER TABLE recordings DROP CONSTRAINT IF EXISTS recordings_user_id_fkey;

-- Relax existing check constraints if any
ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_id_format;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_format;

-- Change column types to TEXT
ALTER TABLE hosts ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE users ALTER COLUMN host_id TYPE TEXT USING host_id::text;
ALTER TABLE rooms ALTER COLUMN host_id TYPE TEXT USING host_id::text;
ALTER TABLE clips ALTER COLUMN host_id TYPE TEXT USING host_id::text;
ALTER TABLE clips ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE recordings ALTER COLUMN host_id TYPE TEXT USING host_id::text;
ALTER TABLE recordings ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Add format checks
ALTER TABLE hosts ADD CONSTRAINT hosts_id_format CHECK (id ~ '^H[0-9]{6}$');
ALTER TABLE users ADD CONSTRAINT users_id_format CHECK (id ~ '^U[0-9]{6}$');

-- Re-create foreign keys
ALTER TABLE users
  ADD CONSTRAINT users_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id);
ALTER TABLE rooms
  ADD CONSTRAINT rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id);
ALTER TABLE clips
  ADD CONSTRAINT clips_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id);
ALTER TABLE clips
  ADD CONSTRAINT clips_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE recordings
  ADD CONSTRAINT recordings_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id);
ALTER TABLE recordings
  ADD CONSTRAINT recordings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

