import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type UserRole = "host" | "user" | null;

type AuthState = {
  userId: string | null;
  hostId: string | null;
  email: string | null;
  displayName: string | null;
  password: string | null;
  avatarUrl: string | null;
  callBackground: string | null;
  role: UserRole;
  token: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  accessJti: string | null;
  twoFactorEnabled: boolean;
  allowMultipleSessions: boolean;
  membershipType: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  status: "idle" | "loading" | "authenticated";
  hydrated: boolean;
};

const initialState: AuthState = {
  userId: null,
  hostId: null,
  email: null,
  displayName: null,
  password: null,
  avatarUrl: null,
  callBackground: null,
  role: null,
  token: null,
  refreshToken: null,
  sessionId: null,
  accessJti: null,
  twoFactorEnabled: false,
  allowMultipleSessions: true,
  membershipType: null,
  membershipStartDate: null,
  membershipEndDate: null,
  status: "idle",
  hydrated: false,
};

export type CredentialsPayload = {
  userId?: string;
  hostId?: string;
  email?: string;
  displayName?: string;
  password?: string;
  avatarUrl?: string;
  callBackground?: string;
  token: string;
  refreshToken?: string | null;
  sessionId?: string | null;
  accessJti?: string | null;
  twoFactorEnabled?: boolean;
  allowMultipleSessions?: boolean;
  membershipType?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  role: Exclude<UserRole, null>;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
      state.userId = action.payload.userId ?? null;
      state.hostId = action.payload.hostId ?? null;
      state.email = action.payload.email ?? null;
      state.displayName = action.payload.displayName ?? null;
      state.password = action.payload.password ?? null;
      state.avatarUrl = action.payload.avatarUrl ?? null;
      state.callBackground = action.payload.callBackground ?? null;
      state.role = action.payload.role;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.sessionId = action.payload.sessionId ?? null;
      state.accessJti = action.payload.accessJti ?? null;
      state.twoFactorEnabled = !!action.payload.twoFactorEnabled;
      state.allowMultipleSessions = action.payload.allowMultipleSessions ?? true;
      state.membershipType = action.payload.membershipType ?? null;
      state.membershipStartDate = action.payload.membershipStartDate ?? null;
      state.membershipEndDate = action.payload.membershipEndDate ?? null;
      state.status = "authenticated";
    },
    logout: () => initialState,
    setStatus: (state, action: PayloadAction<AuthState["status"]>) => {
      state.status = action.payload;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
    setCallBackground: (state, action: PayloadAction<string | null>) => {
      state.callBackground = action.payload;
    },
    setAvatarUrl: (state, action: PayloadAction<string | null>) => {
      state.avatarUrl = action.payload;
    },
  },
});

export const { setCredentials, logout, setStatus, setHydrated, setCallBackground, setAvatarUrl } = authSlice.actions;
export default authSlice.reducer;

