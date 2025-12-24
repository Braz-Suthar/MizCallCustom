import { useEffect, useRef } from "react";

import { CredentialsPayload } from "../state/authSlice";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com/ws";

export const useSocket = (session: CredentialsPayload | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callRef = useRef(activeCall);
  useEffect(() => {
    callRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!session?.token) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    if (wsRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[useSocket] ws open");
      ws.send(JSON.stringify({ type: "auth", token: session.token }));
    };

    ws.onerror = (err) => {
      console.warn("[useSocket] Socket connect error", err);
    };

    ws.onmessage = (ev) => {
      console.log("[useSocket] message", ev.data);
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "call-started") {
          // only set when we have router caps to avoid wiping state
          if (msg.routerRtpCapabilities) {
            dispatch(
              setActiveCall({
                roomId: msg.roomId ?? "main-room",
                routerRtpCapabilities: msg.routerRtpCapabilities,
                hostProducerId: msg.producerId,
              }),
            );
          }
        }
        if (msg.type === "NEW_PRODUCER") {
          const current = callRef.current;
          dispatch(
            setActiveCall({
              roomId: current?.roomId ?? "main-room",
              routerRtpCapabilities: current?.routerRtpCapabilities,
              hostProducerId: msg.producerId,
            }),
          );
        }
        if (msg.type === "call-stopped") {
          dispatch(setActiveCall(null));
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = (ev) => {
      console.log("[useSocket] ws close", ev.code, ev.reason);
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session]);

  return wsRef.current;
};

