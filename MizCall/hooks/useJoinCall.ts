import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { MediaStream } from "react-native-webrtc";

import { useAppSelector } from "../state/store";

const WS_URL = "wss://custom.mizcall.com/ws";

type JoinState = "idle" | "connecting" | "connected" | "error";

export function useJoinCall() {
  const { token, role, hostId } = useAppSelector((s) => s.auth);
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
    if (!token || role !== "user" || !activeCall?.roomId || !activeCall.routerRtpCapabilities) {
      setError("Missing call info or auth");
      setState("error");
      return;
    }

    setState("connecting");
    setError(null);
    setRemoteStream(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    const once = <T extends any>(type: string) =>
      new Promise<T>((resolve) => {
        const handler = (event: WebSocketMessageEvent) => {
          const msg = JSON.parse(event.data);
          if (msg.type === type) {
            ws.removeEventListener("message", handler as any);
            resolve(msg as T);
          }
        };
        ws.addEventListener("message", handler as any);
      });

    ws.onopen = async () => {
      ws.send(JSON.stringify({ type: "auth", token }));
      ws.send(JSON.stringify({ type: "user-joined", roomId: activeCall.roomId }));

      // request transport
      ws.send(JSON.stringify({ type: "create-transport", roomId: activeCall.roomId }));
      const created: any = await once("transport-created");

      const device = new Device();
      await device.load({ routerRtpCapabilities: activeCall.routerRtpCapabilities as RtpCapabilities });
      deviceRef.current = device;

      const transport = device.createRecvTransport(created.data);
      transportRef.current = transport;

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        ws.send(
          JSON.stringify({
            type: "connect-transport",
            roomId: activeCall.roomId,
            transportId: transport.id,
            dtlsParameters,
          }),
        );
        const handle = (event: WebSocketMessageEvent) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "transport-connected" && msg.transportId === transport.id) {
            ws.removeEventListener("message", handle as any);
            callback();
          }
        };
        ws.addEventListener("message", handle as any);
      });

      // consume host producer
      ws.send(
        JSON.stringify({
          type: "consume",
          roomId: activeCall.roomId,
          transportId: transport.id,
          producerOwnerId: hostId,
          rtpCapabilities: device.rtpCapabilities,
        }),
      );

      const consumed: any = await once("consumed");
      const consumer = await transport.consume({
        id: consumed.consumer.id,
        producerId: consumed.consumer.producerId,
        kind: consumed.consumer.kind,
        rtpParameters: consumed.consumer.rtpParameters,
      });

      const stream = new MediaStream([consumer.track]);
      setRemoteStream(stream);
      setState("connected");
    };

    ws.onerror = (e) => {
      setError("WebSocket error");
      setState("error");
    };

    ws.onclose = () => {
      if (state !== "connected") {
        setState("idle");
      }
    };
  }, [token, role, activeCall?.roomId, activeCall?.routerRtpCapabilities, hostId, state]);

  return { join, state, error, remoteStream };
}

