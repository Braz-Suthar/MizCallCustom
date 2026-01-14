import { API_BASE } from "../constants";
import { authFetch } from "../utils/auth";
import type { User } from "../types";

export const userService = {
  // Fetch all users
  fetchUsers: async (token: string) => {
    const res = await authFetch(`${API_BASE}/host/users`, undefined, token);
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  // Create user
  createUser: async (token: string, username: string, password: string) => {
    const res = await authFetch(
      `${API_BASE}/host/users`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create user");
    }
    return res.json();
  },

  // Edit user
  editUser: async (
    token: string,
    userId: string,
    data: { enabled?: boolean; password?: string; enforce_single_device?: boolean | null }
  ) => {
    const res = await authFetch(
      `${API_BASE}/host/users/${userId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
      token
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update user");
    }
    return res.json();
  },

  // Delete user
  deleteUser: async (token: string, userId: string) => {
    const res = await authFetch(`${API_BASE}/host/users/${userId}`, { method: "DELETE" }, token);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to delete user");
    }
    return res.json();
  },

  // Fetch user sessions
  fetchUserSessions: async (token: string, userId: string) => {
    const res = await authFetch(`${API_BASE}/host/users/${userId}/sessions`, undefined, token);
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return res.json();
  },

  // Approve session request
  approveSession: async (token: string, userId: string, requestId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/users/${userId}/sessions/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      },
      token
    );
    if (!res.ok) throw new Error("Failed to approve session");
    return res.json();
  },

  // Reject session request
  rejectSession: async (token: string, userId: string, requestId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/users/${userId}/sessions/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      },
      token
    );
    if (!res.ok) throw new Error("Failed to reject session");
    return res.json();
  },

  // Revoke active session
  revokeSession: async (token: string, userId: string, sessionId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/users/${userId}/sessions/revoke`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      },
      token
    );
    if (!res.ok) throw new Error("Failed to revoke session");
    return res.json();
  },
};
