import { useEffect, useRef } from "react";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com/ws";

export function useCallEvents() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || !role) return;
    if (wsRef.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[useCallEvents] ws open");
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      console.log("[useCallEvents] ws message", event.data);
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "call-started") {
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
        if (msg.type === "host-producer") {
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
        if (msg.type === "call-stopped") {
          dispatch(setActiveCall(null));
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onerror = (err) => {
      console.warn("[useCallEvents] WS error", err);
    };

    ws.onclose = (ev) => {
      console.log("[useCallEvents] ws close", ev.code, ev.reason);
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, role, dispatch]);
}

