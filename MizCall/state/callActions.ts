import { AppDispatch, RootState } from "./store";
import { apiFetch } from "./api";
import { authApiFetch } from "./authActions";
import { addParticipant, clearActiveCall, resetParticipants, setActiveCall, setCallError, setCallStatus } from "./callSlice";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://custom.mizcall.com";

let hostCallSocket: Socket | null = null;

const openHostCallSocket = (token: string, dispatch: AppDispatch, roomId: string) =>
  new Promise<void>((resolve) => {
    if (hostCallSocket) {
      try {
        hostCallSocket.disconnect();
      } catch {
        //
      }
      hostCallSocket = null;
    }

    console.log("[host-call] Connecting to Socket.IO...");

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      autoConnect: true,
      auth: {
        token
      }
    });

    hostCallSocket = socket;

    socket.on("connect", () => {
      console.log("[host-call] Socket.IO connected:", socket.id);
      
      // Send auth message
      socket.emit("auth", { type: "auth", token });
      
      // Notify call started
      socket.emit("call-started", { type: "call-started", roomId });
      socket.emit("CALL_STARTED", { type: "CALL_STARTED", roomId });
      
      resolve();
    });

    socket.on("disconnect", (reason) => {
      console.log("[host-call] Socket.IO disconnected:", reason);
      hostCallSocket = null;
    });

    socket.on("connect_error", (error) => {
      console.log("[host-call] Connection error:", error.message);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[host-call] Reconnected after ${attempt} attempts`);
    });

    // Listen for user joined events
    socket.on("message", (msg) => {
      console.log("[host-call] message:", msg.type);
      try {
        if (msg.type === "user-joined" && msg.userId) {
          dispatch(addParticipant(msg.userId));
        }
        if (msg.type === "USER_JOINED" && msg.userId) {
          dispatch(addParticipant(msg.userId));
        }
        if (msg.type === "call-stopped") {
          dispatch(clearActiveCall());
        }
      } catch (e) {
        console.error("[host-call] Message error:", e);
      }
    });

    // Also listen for specific events
    socket.on("user-joined", (msg) => {
      console.log("[host-call] user-joined:", msg.userId);
      if (msg.userId) {
        dispatch(addParticipant(msg.userId));
      }
    });

    socket.on("USER_JOINED", (msg) => {
      console.log("[host-call] USER_JOINED:", msg.userId);
      if (msg.userId) {
        dispatch(addParticipant(msg.userId));
      }
    });

    socket.on("call-stopped", () => {
      console.log("[host-call] call-stopped");
      dispatch(clearActiveCall());
    });
  });

export const startCall =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const { token, role } = getState().auth;
    if (!token || role !== "host") throw new Error("Not authorized");

    dispatch(setCallStatus("starting"));
    dispatch(setCallError(null));
    dispatch(resetParticipants());
    
    try {
      const res = await dispatch<any>(authApiFetch<{ roomId: string }>("/host/calls/start", {
        method: "POST",
      }));

      dispatch(setActiveCall({ roomId: res.roomId }));
      // notify signaling server to create mediasoup room and broadcast, keep socket open to receive user joins
      await openHostCallSocket(token, dispatch, res.roomId);
      dispatch(setCallStatus("active"));
      return res.roomId;
    } catch (error: any) {
      dispatch(setCallStatus("idle"));
      
      // Check if it's a subscription error
      if (error?.message?.includes('Subscription expired') || 
          error?.message?.includes('subscription') ||
          error?.subscriptionExpired) {
        // Return special error object instead of throwing
        return Promise.reject({
          subscriptionExpired: true,
          membershipType: error?.membershipType,
          message: error?.message || 'Subscription expired',
        });
      }
      
      // For other errors, throw normally
      throw error;
    }
  };

export const endCall =
  (roomId?: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
    const { token, role } = getState().auth;
    const { activeCall } = getState().call;
    
    // Use provided roomId or get from activeCall
    const callId = roomId || activeCall?.roomId;
    
    try {
      // Call backend API to end the call
      if (token && role === "host" && callId) {
        await dispatch<any>(authApiFetch(`/host/calls/${callId}/end`, { method: "PATCH" }));
      }
      
      // Disconnect socket
      hostCallSocket?.disconnect();
    } catch (error) {
      console.error("[endCall] Error ending call:", error);
    } finally {
    hostCallSocket = null;
    dispatch(clearActiveCall());
    dispatch(setCallStatus("idle"));
    dispatch(setCallError(null));
    dispatch(resetParticipants());
    }
  };

