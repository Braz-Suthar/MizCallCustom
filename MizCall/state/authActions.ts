import { AppDispatch } from "./store";
import { CredentialsPayload, setCredentials, setHydrated, setStatus, logout } from "./authSlice";
import { clearSession, loadSession, saveSession } from "./sessionStorage";
import { apiFetch } from "./api";

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
      const res = await apiFetch<{ token: string; hostId?: string; name?: string; avatarUrl?: string }>(
        "/auth/host/login",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: email.trim(), password }),
        },
      );
      const session: CredentialsPayload = {
        email,
        hostId: res.hostId,
        displayName: res.name ?? email,
        password,
        avatarUrl: res.avatarUrl,
        role: "host",
        token: res.token,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
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
      };
      dispatch(setCredentials(session));
      await saveSession(session);
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const registerUser =
  (email: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(setStatus("loading"));
    try {
      const res = await apiFetch<{ token: string; hostId: string }>(
        "/auth/host/register",
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: email.trim() }),
        },
      );
      const session: CredentialsPayload = {
        email,
        hostId: res.hostId,
        role: "host",
        token: res.token,
      };
      dispatch(setCredentials(session));
      await saveSession(session);
    } catch (e) {
      dispatch(setStatus("idle"));
      throw e;
    }
  };

export const signOut = () => async (dispatch: AppDispatch) => {
  await clearSession();
  dispatch(logout());
  dispatch(setHydrated(true));
};

