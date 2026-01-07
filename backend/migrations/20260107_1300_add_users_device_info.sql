-- Add device_info column to users for storing device details
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info JSONB;

