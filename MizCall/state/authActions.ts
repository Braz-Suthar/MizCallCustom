import { AppDispatch, RootState } from "./store";
import { CredentialsPayload, setCredentials, setHydrated, setStatus, logout } from "./authSlice";
import { clearSession, loadSession, saveSession } from "./sessionStorage";
import { apiFetch, apiFetchWithRefresh } from "./api";
import { socketManager } from "../services/socketManager";
import { Platform } from "react-native";
import * as Device from "expo-device";

let cachedDeviceLabel: string | null = null;
const getDeviceLabel = async () => {
  if (cachedDeviceLabel) return cachedDeviceLabel;
  const pieces: Array<string | undefined> = [];
  if (Device.deviceName) pieces.push(Device.deviceName);
  if (Device.modelName && Device.modelName !== Device.deviceName) pieces.push(Device.modelName);
  if (!pieces.length && Device.osName) {
    pieces.push(`${Device.osName}${Device.osVersion ? ` ${Device.osVersion}` : ""}`);
  }
  if (!pieces.length && Platform.OS) {
    pieces.push(`${Platform.OS}${Device.osVersion ? ` ${Device.osVersion}` : ""}`);
  }
  if (!pieces.length && Device.getDeviceNameAsync) {
    try {
      const asyncName = await Device.getDeviceNameAsync();
      if (asyncName) pieces.push(asyncName);
    } catch {
      // ignore
    }
  }
  cachedDeviceLabel = pieces.find(Boolean) || "Unknown device";
  return cachedDeviceLabel;
};

export const hydrateSession = () => async (dispatch: AppDispatch) => {
  dispatch(setStatus("loading"));
  const stored = await loadSession();
  if (stored) {
    dispatch(setCredentials(stored));
  } else {
    dispatch(setStatus("idle"));
  }
  dispatch(setHydrated(true));
};

export const loginHost =
  (email: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const deviceName = await getDeviceLabel();
      const res = await apiFetch<{ token?: string; refreshToken?: string; hostId?: string; name?: string; email?: string; avatarUrl?: string; requireOtp?: boolean; twoFactorEnabled?: boolean; accessJti?: string; sessionId?: string; allowMultipleSessions?: boolean }>(
        "/auth/host/login",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: email.trim(), password, deviceName }),
        },
      );
      if (res.requireOtp) {
        dispatch(setStatus("idle"));
        return { requireOtp: true, hostId: res.hostId, email: res.email ?? email, password };
      }
      const session: CredentialsPayload = {
        email: res.email ?? email,
        hostId: res.hostId,
        displayName: res.name ?? email,
        password,
        avatarUrl: res.avatarUrl,
        role: "host",
        token: res.token,
        refreshToken: res.refreshToken ?? null,
        sessionId: res.sessionId ?? null,
        accessJti: res.accessJti ?? null,
        twoFactorEnabled: res.twoFactorEnabled ?? false,
        allowMultipleSessions: res.allowMultipleSessions ?? true,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
      return { ok: true };
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const loginUser =
  (userId: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const res = await apiFetch<{ token: string; hostId?: string; name?: string; avatarUrl?: string }>(
        "/auth/user/login",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userId.trim(), password }),
        },
      );
      const session: CredentialsPayload = {
        userId,
        hostId: res.hostId,
        displayName: res.name ?? userId,
        password,
        avatarUrl: res.avatarUrl,
        role: "user",
        token: res.token,
        refreshToken: res.refreshToken ?? null,
        twoFactorEnabled: false,
        allowMultipleSessions: true,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
      return { ok: true };
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const registerUser =
  (email: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const deviceName = await getDeviceLabel();
      const res = await apiFetch<{ token: string; hostId: string; avatarUrl?: string; name?: string; email?: string; refreshToken?: string; sessionId?: string; accessJti?: string; allowMultipleSessions?: boolean }>(
        "/auth/host/register",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: email.trim(), password, deviceName }),
        },
      );
      const session: CredentialsPayload = {
        email: res.email ?? email,
        hostId: res.hostId,
        displayName: res.name ?? email,
        avatarUrl: res.avatarUrl ?? null,
        role: "host",
        token: res.token,
        refreshToken: res.refreshToken ?? null,
        sessionId: res.sessionId ?? null,
        accessJti: res.accessJti ?? null,
        twoFactorEnabled: res.twoFactorEnabled ?? false,
        allowMultipleSessions: res.allowMultipleSessions ?? true,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const signOut = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  // Call backend to clear active session
  const { token } = getState().auth;
  if (token) {
    try {
      await apiFetch("/auth/logout", token, {
        method: "POST",
      });
    } catch (e) {
      // Ignore logout errors - still clear local state
      console.warn("[expo] logout API call failed", e);
    }
  }
  
  // Cleanup socket connection on logout
  socketManager.cleanup();
  
  await clearSession();
  dispatch(logout());
  dispatch(setHydrated(true));
};

const updateTokens =
  (dispatch: AppDispatch, getState: () => any) =>
  async (token: string, refreshToken?: string | null, extra?: any) => {
    const current = getState().auth as any;
    if (!current?.role) return;
    const updated: CredentialsPayload = {
      userId: current.userId ?? undefined,
      hostId: current.hostId ?? undefined,
      email: current.email ?? undefined,
      displayName: current.displayName ?? undefined,
      password: current.password ?? undefined,
      avatarUrl: current.avatarUrl ?? undefined,
      callBackground: current.callBackground ?? undefined,
      role: current.role,
      token,
      refreshToken: refreshToken ?? current.refreshToken ?? null,
      sessionId: extra?.sessionId ?? current.sessionId ?? null,
      accessJti: extra?.accessJti ?? current.accessJti ?? null,
      twoFactorEnabled: extra?.twoFactorEnabled ?? current.twoFactorEnabled ?? false,
      allowMultipleSessions: extra?.allowMultipleSessions ?? current.allowMultipleSessions ?? true,
    };
    dispatch(setCredentials(updated));
    await saveSession(updated);
  };

export const authApiFetch =
  <T,>(path: string, options?: RequestInit) =>
  async (_: AppDispatch, getState: () => any) => {
    const { token, refreshToken } = getState().auth as any;
    return apiFetchWithRefresh<T>(path, token, refreshToken, updateTokens(_, getState), options);
  };

export const verifyHostOtp =
  (hostId: string, otp: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const res = await apiFetch<{ token: string; refreshToken?: string; hostId: string; name?: string; email?: string; avatarUrl?: string; twoFactorEnabled?: boolean; allowMultipleSessions?: boolean; sessionId?: string; accessJti?: string }>(
        "/auth/host/login/otp",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId, otp, deviceName: await getDeviceLabel() }),
        },
      );
      const session: CredentialsPayload = {
        email: res.email ?? hostId,
        hostId: res.hostId,
        displayName: res.name ?? hostId,
        password,
        avatarUrl: res.avatarUrl,
        role: "host",
        token: res.token,
        refreshToken: res.refreshToken ?? null,
        sessionId: res.sessionId ?? null,
        accessJti: res.accessJti ?? null,
        twoFactorEnabled: res.twoFactorEnabled ?? true,
        allowMultipleSessions: res.allowMultipleSessions ?? true,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
      return { ok: true };
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const requestHostPasswordOtp =
  (identifier: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const body = identifier.includes("@") ? { email: identifier.trim() } : { hostId: identifier.trim() };
      const res = await apiFetch<{ ok: boolean; hostId: string; email?: string }>("/auth/host/password/otp", "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      dispatch(setStatus("idle"));
      return res;
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const resetHostPassword =
  (payload: { hostId: string; otp: string; newPassword: string }) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const res = await apiFetch<{ ok: boolean }>("/auth/host/password/reset", "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      dispatch(setStatus("idle"));
      return res;
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };
