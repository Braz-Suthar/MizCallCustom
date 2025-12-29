import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { PermissionsAndroid, Platform } from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";

import { ActiveCall } from "../state/callSlice";

const WS_URL = "wss://custom.mizcall.com/ws";

type MediaState = "idle" | "connecting" | "connected" | "error";

export function useHostCallMedia(opts: { token: string | null; role: string | null; call: ActiveCall | null }) {
  const { token, role, call } = opts;

  const [state, setState] = useState<MediaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const pendingProduceResolve = useRef<((id: string) => void) | null>(null);
  const routerCapsRef = useRef<any>(null);
  const pendingSendParamsRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    try {
      sendTransportRef.current?.close?.();
    } catch {}
    sendTransportRef.current = null;
    deviceRef.current = null;
    micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    micStreamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (!token || role !== "host" || !call) {
      cleanup();
      setState("idle");
      setError(null);
      return;
    }

    // Avoid spinning multiple sockets
    if (wsRef.current) return;

    let cancelled = false;

    const start = async () => {
      setState("connecting");
      setError(null);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[useHostCallMedia] ws open");
        ws.send(JSON.stringify({ type: "auth", token }));
        ws.send(JSON.stringify({ type: "JOIN", token }));
        ws.send(JSON.stringify({ type: "GET_ROUTER_CAPS" }));
      };

      ws.onerror = (err) => {
        console.warn("[useHostCallMedia] ws error", err);
        if (!cancelled) {
          setError("WebSocket error");
          setState("error");
        }
      };

      ws.onclose = (ev) => {
        console.log("[useHostCallMedia] ws close", ev.code, ev.reason);
        wsRef.current = null;
        if (!cancelled && state !== "connected") {
          setState("idle");
        }
      };

      ws.onmessage = async (event) => {
        console.log("[useHostCallMedia] ws message", event.data);
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "TURN_CONFIG") {
            // no-op
          }

          if (msg.type === "ROUTER_CAPS") {
      routerCapsRef.current = msg.routerRtpCapabilities || {};
            if (pendingSendParamsRef.current) {
              await createSendTransport(ws, pendingSendParamsRef.current);
              pendingSendParamsRef.current = null;
            }
          }

          if (msg.type === "SEND_TRANSPORT_CREATED") {
            if (!routerCapsRef.current) {
              pendingSendParamsRef.current = msg.params;
              ws.send(JSON.stringify({ type: "GET_ROUTER_CAPS" }));
              return;
            }
            await createSendTransport(ws, msg.params);
          }

          if (msg.type === "PRODUCER_CREATED" && pendingProduceResolve.current) {
            pendingProduceResolve.current(msg.producerId);
            pendingProduceResolve.current = null;
          }
        } catch (e) {
          console.warn("[useHostCallMedia] message parse error", e);
        }
      };
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [token, role, call, cleanup]);

  const createSendTransport = useCallback(
    async (ws: WebSocket, params: any) => {
      // Explicit handler for react-native-webrtc 1.0.6
      const device = new Device({ handlerName: "ReactNative106" as any });
      try {
        await device.load({
          routerRtpCapabilities: routerCapsRef.current,
        });
      } catch (e) {
        console.warn("[useHostCallMedia] device load failed", e);
        setError("Device load failed");
        setState("error");
        return;
      }
      if (!device.canProduce("audio")) {
        console.warn("[useHostCallMedia] cannot produce audio with current device");
        setError("Cannot produce audio on this device");
        setState("error");
        return;
      }
      deviceRef.current = device;

      const transport = device.createSendTransport(params);
      sendTransportRef.current = transport;

      transport.on("connect", ({ dtlsParameters }, callback) => {
        ws.send(
          JSON.stringify({
            type: "CONNECT_SEND_TRANSPORT",
            dtlsParameters,
          }),
        );
        callback();
      });

      transport.on("connectionstatechange", (state: any) => {
        console.log("[useHostCallMedia] send transport state", state);
      });

      transport.on("produce", ({ kind, rtpParameters }, callback) => {
        pendingProduceResolve.current = (id: string) => callback({ id });
        ws.send(
          JSON.stringify({
            type: "PRODUCE",
            kind,
            rtpParameters,
          }),
        );
      });

      try {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error("Microphone permission denied");
          }
        }

        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        micStreamRef.current = stream;
        const track = stream.getAudioTracks()[0] as any;
        track.enabled = micEnabled;
        console.log("[useHostCallMedia] mic track", {
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings?.(),
        });
        await transport.produce({ track });
        setState("connected");
      } catch (err: any) {
        console.warn("[useHostCallMedia] mic/produce error", err);
        setError("Microphone/produce failed");
        setState("error");
      }
    },
    [micEnabled],
  );

  const toggleMic = useCallback((enabled: boolean) => {
    setMicEnabled(enabled);
    micStreamRef.current?.getAudioTracks()?.forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  return { state, error, micEnabled, setMicEnabled: toggleMic };
}

