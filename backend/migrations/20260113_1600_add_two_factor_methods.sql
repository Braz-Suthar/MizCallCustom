-- Add separate columns for email and mobile OTP, plus phone number
ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS email_otp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mobile_otp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Migrate existing two_factor_enabled to email_otp_enabled
UPDATE hosts 
SET email_otp_enabled = two_factor_enabled 
WHERE two_factor_enabled = TRUE AND email_otp_enabled = FALSE;

-- Keep two_factor_enabled as TRUE if either method is enabled
-- This ensures backward compatibility with existing code
UPDATE hosts
SET two_factor_enabled = TRUE
WHERE email_otp_enabled = TRUE OR mobile_otp_enabled = TRUE;
