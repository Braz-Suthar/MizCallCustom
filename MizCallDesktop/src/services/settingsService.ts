import { API_BASE } from "../constants";
import { authFetch } from "../utils/auth";

export const settingsService = {
  // Load 2FA settings
  load2FASettings: async (token: string) => {
    const res = await authFetch(`${API_BASE}/host/two-factor-settings`, undefined, token);
    if (!res.ok) throw new Error("Failed to load 2FA settings");
    return res.json();
  },

  // Toggle email OTP
  toggleEmailOtp: async (token: string, enabled: boolean) => {
    const res = await authFetch(
      `${API_BASE}/host/two-factor-settings/email`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update Email OTP setting");
    }
    return res.json();
  },

  // Toggle multiple sessions
  toggleMultipleSessions: async (token: string, allowMultipleSessions: boolean, refreshToken?: string) => {
    const body: any = { allowMultipleSessions };
    if (!allowMultipleSessions && refreshToken) {
      body.refreshToken = refreshToken;
    }
    const res = await authFetch(
      `${API_BASE}/host/security`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update security settings");
    }
    return res.json();
  },

  // Toggle user single device enforcement
  toggleUserSingleDevice: async (token: string, enforceUserSingleSession: boolean) => {
    const res = await authFetch(
      `${API_BASE}/host/security`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enforceUserSingleSession }),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update setting");
    }
    return res.json();
  },

  // Update profile
  updateProfile: async (token: string, data: { name?: string; avatarUrl?: string }) => {
    const res = await authFetch(
      `${API_BASE}/host/profile`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update profile");
    }
    return res.json();
  },

  // Upload avatar
  uploadAvatar: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await authFetch(
      `${API_BASE}/host/profile/avatar`,
      { method: "POST", body: formData },
      token
    );
    if (!res.ok) throw new Error("Failed to upload avatar");
    return res.json();
  },

  // Get call background
  getCallBackground: async (token: string) => {
    const res = await authFetch(`${API_BASE}/host/call-background`, undefined, token);
    if (!res.ok) throw new Error("Failed to fetch background");
    return res.json();
  },

  // Set call background
  setCallBackground: async (token: string, backgroundUrl: string) => {
    const res = await authFetch(
      `${API_BASE}/host/call-background`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundUrl }),
      },
      token
    );
    if (!res.ok) throw new Error("Failed to set background");
    return res.json();
  },

  // Upload custom background
  uploadBackground: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("background", file);
    const res = await authFetch(
      `${API_BASE}/host/call-background/upload`,
      { method: "POST", body: formData },
      token
    );
    if (!res.ok) throw new Error("Failed to upload background");
    return res.json();
  },

  // Delete custom background
  deleteBackground: async (token: string, backgroundId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/call-background/${backgroundId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw new Error("Failed to delete background");
    return res.json();
  },

  // Remove background
  removeBackground: async (token: string) => {
    const res = await authFetch(
      `${API_BASE}/host/call-background`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw new Error("Failed to remove background");
    return res.json();
  },
};
