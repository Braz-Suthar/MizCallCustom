export type Screen = "login" | "register";
export type Mode = "host" | "user";
export type NavTab = "dashboard" | "users" | "calls" | "recordings" | "settings" | "call-active";

export interface Session {
  token: string;
  refreshToken: string;
  role: "host" | "user";
  hostId?: string;
  userId?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  password?: string;
  twoFactorEnabled?: boolean;
  allowMultipleSessions?: boolean;
  enforceUserSingleSession?: boolean;
  sessionId?: string | null;
  accessJti?: string | null;
  pending?: any[];
  revokedSessions?: string[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  status: "active" | "suspended";
  created_at: string;
  last_active?: string;
}

export interface UserSession {
  id: string;
  device_name: string;
  device_model: string;
  platform: string;
  os_name: string;
  os_version: string;
  ip_address: string;
  created_at: string;
  last_active: string;
}

export interface UserSessionRequest {
  id: string;
  device_name: string;
  device_model: string;
  platform: string;
  os_name: string;
  os_version: string;
  ip_address: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Call {
  id: string;
  roomId: string;
  status: "active" | "ended";
  started_at: string;
  ended_at?: string;
  routerRtpCapabilities?: any;
}

export interface Participant {
  id: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  role: "host" | "user";
  muted: boolean;
  status: string;
  speaking?: boolean;
}

export interface Recording {
  id: string;
  filename: string;
  duration: number;
  size: number;
  created_at: string;
  url?: string;
}

export interface Toast {
  id: string;
  message: string;
  kind: "info" | "success" | "error";
}

export interface BiometricSupport {
  available: boolean;
  type?: "touchid" | "faceid" | "none";
}

export interface AudioDeviceInfo {
  input: MediaDeviceInfo[];
  output: MediaDeviceInfo[];
}

export interface CallBackground {
  id: string;
  url: string;
  isCustom: boolean;
}
