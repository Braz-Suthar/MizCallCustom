import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";

import { CredentialsPayload } from "../state/authSlice";

const SOCKET_URL = "https://custom.mizcall.com";

export const useSocket = (session: CredentialsPayload | null) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: session.token, role: session.role },
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect error", err.message);
    });

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected", reason);
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, [session]);

  return socketRef.current;
};

