import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type UserRole = "host" | "user" | null;

type AuthState = {
  userId: string | null;
  email: string | null;
  role: UserRole;
  token: string | null;
  status: "idle" | "loading" | "authenticated";
  hydrated: boolean;
};

const initialState: AuthState = {
  userId: null,
  email: null,
  role: null,
  token: null,
  status: "idle",
  hydrated: false,
};

export type CredentialsPayload = {
  userId?: string;
  email?: string;
  token: string;
  role: Exclude<UserRole, null>;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
      state.userId = action.payload.userId ?? null;
      state.email = action.payload.email ?? null;
      state.role = action.payload.role;
      state.token = action.payload.token;
      state.status = "authenticated";
    },
    logout: () => initialState,
    setStatus: (state, action: PayloadAction<AuthState["status"]>) => {
      state.status = action.payload;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
  },
});

export const { setCredentials, logout, setStatus, setHydrated } = authSlice.actions;
export default authSlice.reducer;

