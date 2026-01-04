import { useEffect, useRef } from "react";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com";

export function useCallEvents() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!token || !role) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RECONNECT_DELAY = 1000;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      console.log("[useCallEvents] Connecting...", 
        reconnectAttemptsRef.current > 0 ? `(attempt ${reconnectAttemptsRef.current + 1})` : "");

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[useCallEvents] ws open");
        reconnectAttemptsRef.current = 0; // Reset on successful connection
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
        console.warn("[useCallEvents] WS error, will reconnect");
      };

      ws.onclose = (ev) => {
        console.log("[useCallEvents] ws close", ev.code, ev.reason);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (token && role && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[useCallEvents] Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn("[useCallEvents] Max reconnection attempts reached");
        }
      };
    };

    // Initial connection
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnection on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, role, dispatch]);
}

