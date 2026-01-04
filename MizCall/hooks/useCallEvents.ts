import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "https://custom.mizcall.com";

export function useCallEvents() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect() => {
    if (!token || !role) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    console.log("[useCallEvents] Connecting to Socket.IO...");

    const socket = io(WS_URL, {
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

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useCallEvents] Connected:", socket.id);
      setIsConnected(true);
      
      // Send auth message
      socket.emit("auth", { type: "auth", token });
    });

    socket.on("disconnect", (reason) => {
      console.log("[useCallEvents] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.log("[useCallEvents] Connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`[useCallEvents] Reconnect attempt ${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[useCallEvents] Reconnected after ${attempt} attempts`);
      setIsConnected(true);
    });

    socket.on("message", (msg) => {
      try {
        if (msg.type === "call-started" && msg.routerRtpCapabilities) {
          dispatch(
            setActiveCall({
              roomId: msg.roomId ?? "main-room",
              routerRtpCapabilities: msg.routerRtpCapabilities,
              hostProducerId: msg.producerId,
            }),
          );
        }
        
        if (msg.type === "host-producer" && msg.routerRtpCapabilities) {
          dispatch(
            setActiveCall({
              roomId: msg.roomId ?? "main-room",
              routerRtpCapabilities: msg.routerRtpCapabilities,
              hostProducerId: msg.producerId,
            }),
          );
        }
        
        if (msg.type === "call-stopped") {
          dispatch(setActiveCall(null));
        }
      } catch (e) {
        console.error("[useCallEvents] Message error:", e);
      }
    });

    // Listen for specific events
    socket.on("call-started", (msg) => {
      if (msg.routerRtpCapabilities) {
        dispatch(
          setActiveCall({
            roomId: msg.roomId ?? "main-room",
            routerRtpCapabilities: msg.routerRtpCapabilities,
            hostProducerId: msg.producerId,
          }),
        );
      }
    });

    socket.on("host-producer", (msg) => {
      if (msg.routerRtpCapabilities) {
        dispatch(
          setActiveCall({
            roomId: msg.roomId ?? "main-room",
            routerRtpCapabilities: msg.routerRtpCapabilities,
            hostProducerId: msg.producerId,
          }),
        );
      }
    });

    socket.on("call-stopped", () => {
      dispatch(setActiveCall(null));
    });

    return () => {
      console.log("[useCallEvents] Cleaning up...");
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, role, dispatch]);

  return { isConnected };
}

