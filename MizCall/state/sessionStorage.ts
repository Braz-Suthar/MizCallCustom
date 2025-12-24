import AsyncStorage from "@react-native-async-storage/async-storage";

import { CredentialsPayload } from "./authSlice";

const KEY = "mizcall/authSession";

export const saveSession = async (session: CredentialsPayload) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    // non-fatal; ignore storage errors
  }
};

export const loadSession = async (): Promise<CredentialsPayload | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CredentialsPayload) : null;
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

