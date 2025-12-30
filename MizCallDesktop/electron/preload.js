import { contextBridge, ipcRenderer } from "electron";

const API_BASE = "https://custom.mizcall.com";

const bridge = {
  env: process.env.NODE_ENV,
  async loginHost(email, password) {
    const res = await fetch(`${API_BASE}/auth/host/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: email?.trim?.(), password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Host login failed (${res.status})`);
    }
    return res.json();
  },
  async loginUser(userId, password) {
    const res = await fetch(`${API_BASE}/auth/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId?.trim?.(), password }),
    });
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
};

// Expose a minimal bridge; expand as needed (e.g., system info, settings).
try {
  contextBridge.exposeInMainWorld("mizcall", bridge);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Failed to expose bridge", err);
}

