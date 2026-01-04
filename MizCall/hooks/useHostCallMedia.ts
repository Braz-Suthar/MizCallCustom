import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { PermissionsAndroid, Platform } from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";
import { startCallAudio, enableSpeakerphone, stopCallAudio, disableSpeakerphone } from "../utils/callAudio";

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
  const recvTransportRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const consumerRef = useRef<any>(null);
  const pendingProduceResolve = useRef<((id: string) => void) | null>(null);
  const routerCapsRef = useRef<any>(null);
  const pendingSendParamsRef = useRef<any>(null);
  const producedRef = useRef(false);
  const turnConfigRef = useRef<any>(null);
  const pendingConsumeRef = useRef<Array<{ producerId: string; userId?: string }>>([]);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    try {
      sendTransportRef.current?.close?.();
    } catch {}
    sendTransportRef.current = null;
    try {
      recvTransportRef.current?.close?.();
    } catch {}
    recvTransportRef.current = null;
    try {
      consumerRef.current?.close?.();
    } catch {}
    consumerRef.current = null;
    deviceRef.current = null;
    micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    micStreamRef.current = null;
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch {}
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (!token || role !== "host" || !call) {
      cleanup();
      setState("idle");
      setError(null);
      producedRef.current = false;
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
        ws.send(JSON.stringify({ type: "JOIN", token, roomId: call.roomId }));
        ws.send(JSON.stringify({ type: "CALL_STARTED", roomId: call.roomId }));
        ws.send(JSON.stringify({ type: "GET_ROUTER_CAPS", roomId: call.roomId }));
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
            turnConfigRef.current = msg.iceServers ? { iceServers: msg.iceServers } : null;
            console.log("[useHostCallMedia] TURN_CONFIG received", { count: msg.iceServers?.length });
            if (pendingSendParamsRef.current && routerCapsRef.current) {
              console.log("[useHostCallMedia] TURN arrived, creating send transport now");
              const cached = pendingSendParamsRef.current;
              pendingSendParamsRef.current = null;
              await createSendTransport(ws, cached);
            }
          }

          if (msg.type === "ROUTER_CAPS") {
            routerCapsRef.current = msg.routerRtpCapabilities || {};
            if (pendingSendParamsRef.current) {
              // Wait for TURN config too if available
              if (!turnConfigRef.current) {
                console.log("[useHostCallMedia] router caps ready; waiting for TURN before creating send transport");
              } else {
                const cached = pendingSendParamsRef.current;
                pendingSendParamsRef.current = null;
                await createSendTransport(ws, cached);
              }
            }
          }

          if (msg.type === "SEND_TRANSPORT_CREATED") {
            if (!routerCapsRef.current || !turnConfigRef.current) {
              pendingSendParamsRef.current = msg.params;
              if (!routerCapsRef.current) {
                ws.send(JSON.stringify({ type: "GET_ROUTER_CAPS", roomId: call.roomId }));
              }
              console.log("[useHostCallMedia] deferring send transport until caps/turn ready");
              return;
            }
            console.log("[useHostCallMedia] createSendTransport now");
            await createSendTransport(ws, msg.params);
          }

          if (msg.type === "RECV_TRANSPORT_CREATED") {
            const device = deviceRef.current || new Device();
            if (!deviceRef.current) {
              await device.load({ routerRtpCapabilities: routerCapsRef.current });
              deviceRef.current = device;
            }
            const transport = device.createRecvTransport({
              ...msg.params,
              iceServers: turnConfigRef.current?.iceServers,
            });
            recvTransportRef.current = transport;
            transport.on("connect", ({ dtlsParameters }, callback, errback) => {
              try {
                ws.send(JSON.stringify({ type: "CONNECT_RECV_TRANSPORT", dtlsParameters, roomId: call.roomId }));
                callback();
              } catch (err) {
                console.warn("[useHostCallMedia] connect recv failed", err);
                errback?.(err as any);
              }
            });
            transport.on("connectionstatechange", (state: any) => {
              console.log("[useHostCallMedia] recv transport state", state);
            });
            // Drain any pending consumes
            const pending = [...pendingConsumeRef.current];
            pendingConsumeRef.current = [];
            pending.forEach(({ producerId }) => {
              ws.send(
                JSON.stringify({
                  type: "CONSUME",
                  producerId,
                  rtpCapabilities: device.rtpCapabilities,
                  roomId: call.roomId,
                }),
              );
            });
          }

          if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "user") {
            if (recvTransportRef.current && deviceRef.current) {
              ws.send(
                JSON.stringify({
                  type: "CONSUME",
                  producerId: msg.producerId,
                  rtpCapabilities: deviceRef.current.rtpCapabilities,
                  roomId: call.roomId,
                }),
              );
            } else {
              pendingConsumeRef.current.push({ producerId: msg.producerId, userId: msg.userId });
            }
          }

          if (msg.type === "CONSUMER_CREATED") {
            if (!recvTransportRef.current || !deviceRef.current) return;
            try {
              const consumer = await recvTransportRef.current.consume({
                id: msg.params.id,
                producerId: msg.params.producerId,
                kind: msg.params.kind ?? "audio",
                rtpParameters: msg.params.rtpParameters,
              });
              consumerRef.current = consumer;
              await consumer.resume?.();
              const stream = new MediaStream([consumer.track]);
              console.log("[useHostCallMedia] host consuming user audio", {
                consumerId: consumer?.id,
                trackState: consumer?.track?.readyState,
              });
              try {
                startCallAudio();
                enableSpeakerphone();
              } catch {}
            } catch (err) {
              console.warn("[useHostCallMedia] consume failed", err);
            }
          }

          if (msg.type === "PRODUCER_CREATED" && pendingProduceResolve.current) {
            pendingProduceResolve.current(msg.producerId);
            pendingProduceResolve.current = null;
            console.log("[useHostCallMedia] PRODUCER_CREATED", msg.producerId);
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

  const doProduce = useCallback(
    async (ws: WebSocket, transport: any, device: Device, roomId: string) => {
      if (!micStreamRef.current) {
        try {
          const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          micStreamRef.current = stream;
        } catch (err: any) {
          console.warn("[useHostCallMedia] mic getUserMedia failed", err?.message || err);
          setError("Microphone/produce failed");
          setState("error");
          return;
        }
      }

      const track = micStreamRef.current.getAudioTracks()[0] as any;
      track.enabled = micEnabled;
      console.log("[useHostCallMedia] mic track", {
        enabled: track.enabled,
        readyState: track.readyState,
        settings: track.getSettings?.(),
      });

      const opusCodec = (device.rtpCapabilities?.codecs || []).find(
        (c) => c.mimeType?.toLowerCase?.() === "audio/opus"
      );

      console.log("[useHostCallMedia] calling produce()", { hasOpus: !!opusCodec, roomId });
      try {
        producedRef.current = true;
        await transport.produce({ track, codec: opusCodec });
        console.log("[useHostCallMedia] produce request sent");
        setState("connected");
      } catch (err: any) {
        producedRef.current = false;
        console.warn("[useHostCallMedia] produce failed", err?.message || err);
        setError(err?.message || "Produce failed");
        setState("error");
      }
    },
    [micEnabled],
  );

  const createSendTransport = useCallback(
    async (ws: WebSocket, params: any) => {
      const roomId = call?.roomId ?? "main-room";
      const relayCandidates = (params.iceCandidates || []).filter((c: any) => (c.type || "").toLowerCase() === "relay");
      const useRelayOnly = relayCandidates.length > 0;
      const transportParams = useRelayOnly ? { ...params, iceCandidates: relayCandidates } : params;
      console.log("[useHostCallMedia] creating send transport", {
        relayOnly: useRelayOnly,
        iceCount: (transportParams.iceCandidates || []).length,
        hasTurn: !!turnConfigRef.current,
      });

      const device = new Device();
      try {
        await device.load({
          routerRtpCapabilities: routerCapsRef.current,
        });
        console.log("[useHostCallMedia] device loaded");
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

      const transport = device.createSendTransport({
        ...transportParams,
        iceServers: turnConfigRef.current?.iceServers,
        // Do not force relay: mediasoup provides host-only candidates; forcing relay drops them.
        iceTransportPolicy: undefined,
      });
      sendTransportRef.current = transport;

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        console.log("[useHostCallMedia] CONNECT_SEND_TRANSPORT", { roomId });
        try {
          ws.send(
            JSON.stringify({
              type: "CONNECT_SEND_TRANSPORT",
              dtlsParameters,
              roomId,
            }),
          );
          callback();
        } catch (err) {
          console.warn("[useHostCallMedia] connect send failed", err);
          errback?.(err as any);
        }
      });

      transport.on("connectionstatechange", (state: any) => {
        console.log("[useHostCallMedia] send transport state", state);
        if (state === "failed") {
          setError("Send transport failed");
          setState("error");
        }
      });

      transport.on("produce", ({ kind, rtpParameters }, callback) => {
        pendingProduceResolve.current = (id: string) => callback({ id });
        console.log("[useHostCallMedia] producing kind", kind, "room", roomId);
        ws.send(
          JSON.stringify({
            type: "PRODUCE",
            kind,
            rtpParameters,
            roomId,
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
        // Start produce immediately to trigger DTLS connect
        if (!producedRef.current) {
          void doProduce(ws, transport, device, roomId);
        }
      } catch (err: any) {
        console.warn("[useHostCallMedia] mic/produce error", err);
        setError("Microphone/produce failed");
        setState("error");
      }
    },
    [call?.roomId, micEnabled, doProduce],
  );

  const toggleMic = useCallback((enabled: boolean) => {
    setMicEnabled(enabled);
    micStreamRef.current?.getAudioTracks()?.forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  return { state, error, micEnabled, setMicEnabled: toggleMic };
}

