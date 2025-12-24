import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type ActiveCall = {
  roomId: string;
  routerRtpCapabilities?: any;
  hostProducerId?: string;
};

type CallState = {
  activeCall: ActiveCall | null;
  status: "idle" | "starting" | "active";
  error?: string | null;
  participants: string[];
};

const initialState: CallState = {
  activeCall: null,
  status: "idle",
  error: null,
  participants: [],
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setActiveCall: (state, action: PayloadAction<ActiveCall | null>) => {
      state.activeCall = action.payload;
      state.status = action.payload ? "active" : "idle";
      state.error = null;
      if (!action.payload) {
        state.participants = [];
      }
    },
    clearActiveCall: (state) => {
      state.activeCall = null;
      state.status = "idle";
      state.error = null;
      state.participants = [];
    },
    setCallStatus: (state, action: PayloadAction<CallState["status"]>) => {
      state.status = action.payload;
    },
    setCallError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addParticipant: (state, action: PayloadAction<string>) => {
      if (!state.participants.includes(action.payload)) {
        state.participants.push(action.payload);
      }
    },
    resetParticipants: (state) => {
      state.participants = [];
    },
  },
});

export const { setActiveCall, clearActiveCall, setCallStatus, setCallError, addParticipant, resetParticipants } =
  callSlice.actions;
export default callSlice.reducer;

