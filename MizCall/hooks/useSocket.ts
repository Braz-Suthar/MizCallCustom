import { useEffect, useRef } from "react";

import { CredentialsPayload } from "../state/authSlice";

const WS_URL = "wss://custom.mizcall.com/ws";

export const useSocket = (session: CredentialsPayload | null) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!session?.token) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token: session.token }));
    };

    ws.onerror = (err) => {
      console.warn("Socket connect error", err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session]);

  return wsRef.current;
};

