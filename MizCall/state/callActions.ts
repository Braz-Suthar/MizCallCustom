import { AppDispatch, RootState } from "./store";
import { apiFetch } from "./api";
import { addParticipant, clearActiveCall, resetParticipants, setActiveCall, setCallError, setCallStatus } from "./callSlice";

const WS_URL = "wss://custom.mizcall.com/ws";

let hostCallWs: WebSocket | null = null;

const openHostCallSocket = (token: string, dispatch: AppDispatch, roomId: string) =>
  new Promise<void>((resolve) => {
    if (hostCallWs) {
      try {
        hostCallWs.close();
      } catch {
        //
      }
      hostCallWs = null;
    }

    const ws = new WebSocket(WS_URL);
    hostCallWs = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token }));
      ws.send(JSON.stringify({ type: "call-started", roomId }));
      resolve();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "user-joined" && msg.userId) {
          dispatch(addParticipant(msg.userId));
        }
        if (msg.type === "call-stopped") {
          dispatch(clearActiveCall());
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      // we keep silent; UI already shows call status
    };

    ws.onclose = () => {
      hostCallWs = null;
    };
  });

export const startCall =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const { token, role } = getState().auth;
    if (!token || role !== "host") throw new Error("Not authorized");

    dispatch(setCallStatus("starting"));
    dispatch(setCallError(null));
    dispatch(resetParticipants());
    const res = await apiFetch<{ roomId: string }>("/host/calls/start", token, {
      method: "POST",
    });

    dispatch(setActiveCall({ roomId: res.roomId }));
    // notify signaling server to create mediasoup room and broadcast, keep socket open to receive user joins
    await openHostCallSocket(token, dispatch, res.roomId);
    dispatch(setCallStatus("active"));
    return res.roomId;
  };

export const endCall =
  () => async (dispatch: AppDispatch) => {
    try {
      hostCallWs?.close();
    } catch {
      //
    }
    hostCallWs = null;
    dispatch(clearActiveCall());
    dispatch(setCallStatus("idle"));
    dispatch(setCallError(null));
    dispatch(resetParticipants());
  };

