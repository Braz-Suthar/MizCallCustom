import { useEffect, useRef } from "react";

import { CredentialsPayload } from "../state/authSlice";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com";

export const useSocket = (session: CredentialsPayload | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callRef = useRef(activeCall);
  
  useEffect(() => {
    callRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!session?.token) {
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

      console.log("[useSocket] Connecting...", 
        reconnectAttemptsRef.current > 0 ? `(attempt ${reconnectAttemptsRef.current + 1})` : "");

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[useSocket] ws open");
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        ws.send(JSON.stringify({ type: "auth", token: session.token }));
      };

      ws.onerror = (err) => {
        console.warn("[useSocket] Socket error, will reconnect");
      };

      ws.onmessage = (ev) => {
        console.log("[useSocket] message", ev.data);
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "call-started") {
            const current = callRef.current;
            dispatch(
              setActiveCall({
                roomId: msg.roomId ?? current?.roomId ?? "main-room",
                routerRtpCapabilities: msg.routerRtpCapabilities ?? current?.routerRtpCapabilities,
                hostProducerId: current?.hostProducerId,
              }),
            );
          }
          if (msg.type === "NEW_PRODUCER") {
            const current = callRef.current;
            dispatch(
              setActiveCall({
                roomId: current?.roomId ?? msg.roomId ?? "main-room",
                routerRtpCapabilities: current?.routerRtpCapabilities ?? msg.routerRtpCapabilities,
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

        // Attempt to reconnect with exponential backoff
        if (session?.token && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[useSocket] Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn("[useSocket] Max reconnection attempts reached");
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
  }, [session, dispatch]);

  return wsRef.current;
};

