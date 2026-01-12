-- Create table for OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id SERIAL PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_host_phone UNIQUE (host_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_host_phone ON otp_verifications(host_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires ON otp_verifications(expires_at);
