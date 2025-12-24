import { useEffect, useRef } from "react";

import { CredentialsPayload } from "../state/authSlice";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch } from "../state/store";

const WS_URL = "wss://custom.mizcall.com";

export const useSocket = (session: CredentialsPayload | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!session?.token) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

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
          dispatch(
            setActiveCall({
              roomId: msg.roomId,
              routerRtpCapabilities: msg.routerRtpCapabilities,
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
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session]);

  return wsRef.current;
};

