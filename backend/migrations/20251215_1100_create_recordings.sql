-- 20251215_1100_create_recordings.sql

CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY,

  host_id UUID NOT NULL,
  user_id UUID NOT NULL,
  meeting_id UUID NOT NULL,

  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NOT NULL,

  file_path TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_host
  ON recordings(host_id);

CREATE INDEX IF NOT EXISTS idx_recordings_user
  ON recordings(user_id);

CREATE INDEX IF NOT EXISTS idx_recordings_meeting
  ON recordings(meeting_id);

CREATE INDEX IF NOT EXISTS idx_recordings_started
  ON recordings(started_at);
