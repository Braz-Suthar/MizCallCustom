import { API_BASE } from "../constants";
import type { Session } from "../types";

export const authFetch = (url: string, options?: RequestInit, token?: string) => {
  const sessionToken = token || getSessionToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
  });
};

export const getSessionToken = (): string | null => {
  try {
    const raw = localStorage.getItem("mizcall.session");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || null;
    }
  } catch {
    return null;
  }
  return null;
};

export const saveSession = (session: Session) => {
  try {
    localStorage.setItem("mizcall.session", JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem("mizcall.session");
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
};

export const getStoredSession = (): Session | null => {
  try {
    const raw = localStorage.getItem("mizcall.session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && parsed?.role) {
        return parsed;
      }
    }
  } catch {
    clearSession();
  }
  return null;
};
