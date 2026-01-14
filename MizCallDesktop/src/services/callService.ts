import { API_BASE } from "../constants";
import { authFetch } from "../utils/auth";

export const callService = {
  // Fetch all calls
  fetchCalls: async (token: string) => {
    const res = await authFetch(`${API_BASE}/host/calls`, undefined, token);
    if (!res.ok) throw new Error("Failed to fetch calls");
    return res.json();
  },

  // Start a new call
  startCall: async (token: string) => {
    const res = await authFetch(
      `${API_BASE}/host/calls/start`,
      { method: "POST" },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to start call");
    }
    return res.json();
  },

  // End a call
  endCall: async (token: string, callId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/calls/${callId}/end`,
      { method: "PATCH" },
      token
    );
    if (!res.ok) throw new Error(`End call failed (${res.status})`);
    return res.json();
  },
};
