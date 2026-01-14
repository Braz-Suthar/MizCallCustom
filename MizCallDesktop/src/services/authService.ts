import { API_BASE } from "../constants";
import { authFetch } from "../utils/auth";

export const authService = {
  // Host Login
  loginHost: async (identifier: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/host/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Login failed (${res.status})`);
    }
    return res.json();
  },

  // Verify Host OTP
  verifyHostOtp: async (token: string, otp: string) => {
    const res = await fetch(`${API_BASE}/auth/host/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "OTP verification failed");
    }
    return res.json();
  },

  // Resend Host OTP
  resendHostOtp: async (token: string) => {
    const res = await fetch(`${API_BASE}/auth/host/resend-otp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to resend OTP");
    }
    return res.json();
  },

  // User Login
  loginUser: async (userId: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Login failed (${res.status})`);
    }
    return res.json();
  },

  // Forgot Password - Send OTP
  sendForgotPasswordOtp: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/host/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to send OTP");
    }
    return res.json();
  },

  // Forgot Password - Reset
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await fetch(`${API_BASE}/auth/host/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to reset password");
    }
    return res.json();
  },

  // Change Password
  changePassword: async (token: string, currentPassword: string, newPassword: string) => {
    const res = await authFetch(
      `${API_BASE}/host/change-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to change password");
    }
    return res.json();
  },
};
