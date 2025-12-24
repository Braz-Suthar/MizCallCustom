import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { MediaStream } from "react-native-webrtc";

import { useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com/ws";

type JoinState = "idle" | "connecting" | "connected" | "error";

export function useJoinCall() {
  const { token, role } = useAppSelector((s) => s.auth);
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<any>(null);

  const cleanup = () => {
    wsRef.current?.close();
    wsRef.current = null;
    transportRef.current?.close?.();
    transportRef.current = null;
    deviceRef.current = null;
  };

  useEffect(() => cleanup, []);

  const join = useCallback(async () => {
    if (!token || role !== "user" || !activeCall?.routerRtpCapabilities) {
      setError("Missing call info or auth");
      setState("error");
      return;
    }

    setState("connecting");
    setError(null);
    setRemoteStream(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("[useJoinCall] ws open");
      ws.send(JSON.stringify({ type: "auth", token }));
      ws.send(JSON.stringify({ type: "JOIN", token }));
    };

    ws.onerror = (e) => {
      console.warn("[useJoinCall] ws error", e);
      setError("WebSocket error");
      setState("error");
    };

    ws.onclose = (ev) => {
      console.log("[useJoinCall] ws close", ev.code, ev.reason);
      wsRef.current = null;
      if (state !== "connected") {
        setState("idle");
      }
    };

    ws.onmessage = async (event) => {
      console.log("[useJoinCall] ws message", event.data);
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "RECV_TRANSPORT_CREATED") {
          const device = new Device({ handlerName: "ReactNative106" as any });
          await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
          deviceRef.current = device;

          const transport = device.createRecvTransport(msg.params);
          transportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            ws.send(
              JSON.stringify({
                type: "CONNECT_RECV_TRANSPORT",
                dtlsParameters,
              }),
            );
            callback();
          });
        }

        if (msg.type === "NEW_PRODUCER") {
          ws.send(
            JSON.stringify({
              type: "CONSUME",
              producerId: msg.producerId,
            }),
          );
        }

        if (msg.type === "CONSUMER_CREATED") {
          if (!transportRef.current || !deviceRef.current) return;
          const consumer = await transportRef.current.consume({
            id: msg.params.id,
            producerId: msg.params.producerId,
            kind: msg.params.kind,
            rtpParameters: msg.params.rtpParameters,
          });
          const stream = new MediaStream([consumer.track]);
          setRemoteStream(stream);
          setState("connected");
        }
      } catch {
        // ignore parse errors
      }
    };
  }, [token, role, activeCall?.routerRtpCapabilities]);

  return { join, state, error, remoteStream };
}

