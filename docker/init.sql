CREATE TABLE hosts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  host_id UUID REFERENCES hosts(id),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_speaking TIMESTAMPTZ
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  host_id UUID REFERENCES hosts(id),
  status TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE clips (
  id UUID PRIMARY KEY,
  host_id UUID,
  user_id UUID,
  room_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  file_path TEXT
);
