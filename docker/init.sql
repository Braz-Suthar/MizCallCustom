CREATE TABLE hosts (
  id TEXT PRIMARY KEY CHECK (id ~ '^H[0-9]{6}$'),
  name TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY CHECK (id ~ '^U[0-9]{6}$'),
  host_id TEXT REFERENCES hosts(id),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_speaking TIMESTAMPTZ
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  host_id TEXT REFERENCES hosts(id),
  status TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE clips (
  id UUID PRIMARY KEY,
  host_id TEXT,
  user_id TEXT,
  room_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  file_path TEXT
);
