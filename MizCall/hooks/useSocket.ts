import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { CredentialsPayload } from "../state/authSlice";
import { setActiveCall } from "../state/callSlice";
import { useAppDispatch, useAppSelector } from "../state/store";

const WS_URL = "https://custom.mizcall.com";

export const useSocket = (session: CredentialsPayload | null) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callRef = useRef(activeCall);
  
  useEffect(() => {
    callRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!session?.token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    console.log("[useSocket] Connecting to Socket.IO...");

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      autoConnect: true,
      auth: {
        token: session.token
      }
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useSocket] Connected:", socket.id);
      setIsConnected(true);
      
      // Send auth message
      socket.emit("auth", { type: "auth", token: session.token });
    });

    socket.on("disconnect", (reason) => {
      console.log("[useSocket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.log("[useSocket] Connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`[useSocket] Reconnect attempt ${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[useSocket] Reconnected after ${attempt} attempts`);
      setIsConnected(true);
    });

    socket.on("message", (msg) => {
      try {
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
      } catch (e) {
        console.error("[useSocket] Message error:", e);
      }
    });

    // Listen for specific events
    socket.on("call-started", (msg) => {
      const current = callRef.current;
      dispatch(
        setActiveCall({
          roomId: msg.roomId ?? current?.roomId ?? "main-room",
          routerRtpCapabilities: msg.routerRtpCapabilities ?? current?.routerRtpCapabilities,
          hostProducerId: current?.hostProducerId,
        }),
      );
    });

    socket.on("call-stopped", () => {
      dispatch(setActiveCall(null));
    });

    return () => {
      console.log("[useSocket] Cleaning up...");
      if (socket) {
        socket.disconnect();
      }
    };
  }, [session?.token, dispatch]);

  return { socket: socketRef.current, isConnected };
};

