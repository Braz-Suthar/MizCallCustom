-- Create device_tokens table for Firebase Cloud Messaging
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  host_id TEXT REFERENCES hosts(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT, -- 'ios', 'android', 'web', 'desktop'
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT device_tokens_unique_token UNIQUE (token),
  CONSTRAINT device_tokens_user_or_host CHECK (
    (user_id IS NOT NULL AND host_id IS NULL) OR 
    (user_id IS NULL AND host_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_host ON device_tokens(host_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

-- Create notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL, -- host_id who sent it
  recipient_type TEXT NOT NULL, -- 'user', 'host', 'all_users'
  recipient_id TEXT, -- specific user_id or null for broadcast
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- custom data payload
  notification_type TEXT, -- 'call_started', 'custom', 'system'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);
