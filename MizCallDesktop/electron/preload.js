import { contextBridge, ipcRenderer } from "electron";
import os from "os";

const API_BASE = "https://custom.mizcall.com";

const bridge = {
  env: process.env.NODE_ENV,
  deviceLabel: os.hostname?.() || os.type?.() || "Desktop",
  deviceModel: os.type?.() || null,
  platform: "desktop",
  osName: os.type?.() || null,
  osVersion: os.release?.() || null,
  async loginHost(email, password) {
    const res = await fetch(`${API_BASE}/auth/host/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Name": bridge.deviceLabel },
      body: JSON.stringify({
        hostId: email?.trim?.(),
        password,
        deviceName: bridge.deviceLabel,
        deviceModel: bridge.deviceModel,
        platform: bridge.platform,
        osName: bridge.osName,
        osVersion: bridge.osVersion,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Host login failed (${res.status})`);
    }
    return res.json();
  },
  async verifyHostOtp(hostId, otp) {
    const res = await fetch(`${API_BASE}/auth/host/login/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Name": bridge.deviceLabel },
      body: JSON.stringify({
        hostId,
        otp,
        deviceName: bridge.deviceLabel,
        deviceModel: bridge.deviceModel,
        platform: bridge.platform,
        osName: bridge.osName,
        osVersion: bridge.osVersion,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `OTP verification failed (${res.status})`);
    }
    return res.json();
  },
  async requestHostPasswordOtp(identifier) {
    const body = identifier.includes("@")
      ? { email: identifier.trim() }
      : { hostId: identifier.trim() };
    const res = await fetch(`${API_BASE}/auth/host/password/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Send OTP failed (${res.status})`);
    }
    return res.json();
  },
  async resetHostPassword({ hostId, otp, newPassword }) {
    const res = await fetch(`${API_BASE}/auth/host/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId, otp, newPassword }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Reset failed (${res.status})`);
    }
    return res.json();
  },
  async loginUser(userId, password) {
    const res = await fetch(`${API_BASE}/auth/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId?.trim?.(), password }),
    });
    
    // Handle pending approval (202 status)
    if (res.status === 202) {
      const data = await res.json();
      return {
        pending: true,
        message: data.message || "Session approval pending",
        existingDevice: data.existingDevice,
        existingPlatform: data.existingPlatform,
        existingLoginTime: data.existingLoginTime,
      };
    }
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `User login failed (${res.status})`);
    }
    return res.json();
  },
  openActiveCallWindow(payload) {
    ipcRenderer.send("open-active-call-window", payload);
  },
  onActiveCallContext(cb) {
    const listener = (_event, data) => cb?.(data);
    ipcRenderer.on("active-call-context", listener);
    return () => ipcRenderer.removeListener("active-call-context", listener);
  },
  // New: Open system settings for permissions
  openSystemSettings(type) {
    console.log("[Preload] openSystemSettings called with type:", type);
    console.log("[Preload] ipcRenderer available:", !!ipcRenderer);
    console.log("[Preload] Sending IPC message: open-system-settings");
    
    try {
      const result = ipcRenderer.send("open-system-settings", type);
      console.log("[Preload] ✅ IPC send result:", result);
      console.log("[Preload] ✅ IPC message sent successfully");
      
      // Also log to verify it was sent
      setTimeout(() => {
        console.log("[Preload] IPC message should have been processed by now");
      }, 100);
    } catch (error) {
      console.error("[Preload] ❌ Failed to send IPC message:", error);
      console.error("[Preload] Error stack:", error.stack);
    }
  },
};

// Expose a minimal bridge; expand as needed (e.g., system info, settings).
try {
  contextBridge.exposeInMainWorld("mizcall", bridge);
  console.log("[Preload] ✅ Bridge exposed successfully. Available functions:", Object.keys(bridge));
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[Preload] ❌ Failed to expose bridge:", err);
}

// Also test IPC immediately to verify it works
setTimeout(() => {
  console.log("[Preload] Testing IPC connection...");
  try {
    ipcRenderer.send("test-ipc", "hello");
    console.log("[Preload] Test IPC sent");
  } catch (e) {
    console.error("[Preload] Test IPC failed:", e);
  }
}, 1000);

