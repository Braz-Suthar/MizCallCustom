const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map();

export function setOtp(key, otp) {
  const expiresAt = Date.now() + OTP_TTL_MS;
  store.set(key, { otp, expiresAt });
}

export function verifyOtp(key, otp) {
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  const match = entry.otp === otp;
  if (match) {
    store.delete(key);
  }
  return match;
}

