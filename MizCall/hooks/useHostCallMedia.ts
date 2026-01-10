import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { PermissionsAndroid, Platform } from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";
import { io, Socket } from "socket.io-client";
import { startCallAudio, enableSpeakerphone, stopCallAudio, disableSpeakerphone, isMobilePlatform } from "../utils/callAudio";

import { ActiveCall } from "../state/callSlice";

const SOCKET_URL = "https://custom.mizcall.com";

type MediaState = "idle" | "connecting" | "connected" | "error";

export function useHostCallMedia(opts: { token: string | null; role: string | null; call: ActiveCall | null; onSpeakingStatus?: (userId: string, speaking: boolean) => void }) {
  const { token, role, call, onSpeakingStatus } = opts;

  const [state, setState] = useState<MediaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const consumerRef = useRef<any>(null);
  const currentProducerIdRef = useRef<string | null>(null); // Track which producer we're consuming
  const pendingProduceResolve = useRef<((id: string) => void) | null>(null);
  const routerCapsRef = useRef<any>(null);
  const pendingSendParamsRef = useRef<any>(null);
  const pendingRecvParamsRef = useRef<any>(null);
  const producedRef = useRef(false);
  const turnConfigRef = useRef<any>(null);
  const pendingConsumeRef = useRef<Array<{ producerId: string; userId?: string }>>([]);
  const processedConsumerIdsRef = useRef<Set<string>>(new Set());
  const restartingRef = useRef(false);

  const createDevice = useCallback(() => {
    // React Native needs the explicit handler; desktop/web can use default
    if (Platform.OS === "ios" || Platform.OS === "android") {
      return new Device({ handlerName: "ReactNative106" as any });
    }
    return new Device();
  }, []);

  const cleanup = useCallback(() => {
    console.log("[useHostCallMedia] Starting cleanup...");
    
    // Remove all socket listeners first
    if (socketRef.current) {
      console.log("[useHostCallMedia] Removing socket listeners and disconnecting");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    socketRef.current = null;
    
    // Close consumer first (before transport)
    try {
      if (consumerRef.current) {
        console.log("[useHostCallMedia] Closing consumer");
        consumerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing consumer:", e);
    }
    consumerRef.current = null;
    currentProducerIdRef.current = null;
    processedConsumerIdsRef.current.clear();
    
    // Close transports
    try {
      if (recvTransportRef.current) {
        console.log("[useHostCallMedia] Closing recv transport");
        recvTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    try {
      if (sendTransportRef.current) {
        console.log("[useHostCallMedia] Closing send transport");
        sendTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    // Clear device
    deviceRef.current = null;
    
    // Stop and close all microphone tracks
    if (micStreamRef.current) {
      console.log("[useHostCallMedia] Stopping microphone tracks");
      micStreamRef.current.getTracks?.().forEach((t) => {
        console.log("[useHostCallMedia] Stopping track:", t.id, t.label);
        t.stop();
      });
      micStreamRef.current = null;
    }
    
    // Stop call audio
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch (e) {
      console.warn("[useHostCallMedia] Error stopping call audio:", e);
    }
    
    // Clear remote stream
    setRemoteStream(null);
    
    // Clear refs
    routerCapsRef.current = null;
    pendingSendParamsRef.current = null;
    turnConfigRef.current = null;
    pendingConsumeRef.current = [];
    producedRef.current = false;
    
    console.log("[useHostCallMedia] ✅ Cleanup complete");
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    const roomId = call?.roomId ?? null;

    if (!token || role !== "host" || !roomId) {
      console.log("[useHostCallMedia] No call or not authorized, cleaning up");
      cleanup();
      setState("idle");
      setError(null);
      producedRef.current = false;
      return;
    }

    // Avoid spinning multiple sockets
    if (socketRef.current) {
      console.log("[useHostCallMedia] Socket already exists, skipping initialization");
      return;
    }

    let cancelled = false;

    const start = async () => {
      setState("connecting");
      setError(null);

      console.log("[useHostCallMedia] Connecting to Socket.IO...");

      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
        auth: {
          token
        }
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[useHostCallMedia] Socket.IO connected:", socket.id);
        socket.emit("auth", { type: "auth", token });
        socket.emit("JOIN", { type: "JOIN", token, roomId });
        socket.emit("CALL_STARTED", { type: "CALL_STARTED", roomId });
        socket.emit("GET_ROUTER_CAPS", { type: "GET_ROUTER_CAPS", roomId });
      });

      socket.on("disconnect", (reason) => {
        console.log("[useHostCallMedia] Socket.IO disconnected:", reason);
        socketRef.current = null;
        if (!cancelled && state !== "connected") {
          setState("idle");
        }
      });

      socket.on("connect_error", (error) => {
        console.log("[useHostCallMedia] Connection error:", error.message);
        if (!cancelled) {
          setError("Connection error");
          setState("error");
        }
      });

      const handleMessage = async (msg: any) => {
        console.log("[useHostCallMedia] message:", msg.type);
        try {
          if (msg.type === "TURN_CONFIG") {
            turnConfigRef.current = msg.iceServers ? { iceServers: msg.iceServers } : null;
            console.log("[useHostCallMedia] TURN_CONFIG received", { count: msg.iceServers?.length });
            if (pendingSendParamsRef.current && routerCapsRef.current) {
              console.log("[useHostCallMedia] TURN arrived, creating send transport now");
              const cached = pendingSendParamsRef.current;
              pendingSendParamsRef.current = null;
              await createSendTransport(socket, cached);
            }
            if (pendingRecvParamsRef.current && routerCapsRef.current) {
              console.log("[useHostCallMedia] TURN arrived, creating recv transport now");
              const cachedRecv = pendingRecvParamsRef.current;
              pendingRecvParamsRef.current = null;
              await createRecvTransport(socket, cachedRecv);
            }
          }

          if (msg.type === "ROUTER_CAPS") {
            routerCapsRef.current = msg.routerRtpCapabilities || {};
            if (pendingSendParamsRef.current) {
              if (!turnConfigRef.current) {
                console.log("[useHostCallMedia] router caps ready; waiting for TURN before creating send transport");
              } else {
                const cached = pendingSendParamsRef.current;
                pendingSendParamsRef.current = null;
                await createSendTransport(socket, cached);
              }
            }
            if (pendingRecvParamsRef.current && turnConfigRef.current) {
              const cachedRecv = pendingRecvParamsRef.current;
              pendingRecvParamsRef.current = null;
              await createRecvTransport(socket, cachedRecv);
            }
          }

          if (msg.type === "SEND_TRANSPORT_CREATED") {
            if (!routerCapsRef.current || !turnConfigRef.current) {
              pendingSendParamsRef.current = msg.params;
              if (!routerCapsRef.current) {
                socket.emit("GET_ROUTER_CAPS", { type: "GET_ROUTER_CAPS", roomId });
              }
              console.log("[useHostCallMedia] deferring send transport until caps/turn ready");
              return;
            }
            console.log("[useHostCallMedia] createSendTransport now");
            await createSendTransport(socket, msg.params);
          }

          if (msg.type === "RECV_TRANSPORT_CREATED") {
            // Wait for TURN + router caps before creating recv transport (mobile often needs TURN)
            if (!routerCapsRef.current || !turnConfigRef.current) {
              pendingRecvParamsRef.current = msg.params;
              if (!routerCapsRef.current) {
                socket.emit("GET_ROUTER_CAPS", { type: "GET_ROUTER_CAPS", roomId });
              }
              console.log("[useHostCallMedia] deferring recv transport until caps/turn ready");
              return;
            }
            await createRecvTransport(socket, msg.params);
          }

          if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "user") {
            console.log("[useHostCallMedia] NEW_PRODUCER from user:", msg.producerId);
            
            // Check if we already have a consumer for THIS SPECIFIC producer
            if (consumerRef.current && currentProducerIdRef.current === msg.producerId) {
              console.log("[useHostCallMedia] Consumer already exists for this producer, reusing it");
              return;
            }
            
            // If we have a consumer but for a DIFFERENT producer (user rejoined with new producer)
            if (consumerRef.current && currentProducerIdRef.current !== msg.producerId) {
              console.log("[useHostCallMedia] User rejoined with NEW producer, closing old consumer");
              console.log("[useHostCallMedia] Old producer:", currentProducerIdRef.current, "-> New producer:", msg.producerId);
              try {
                consumerRef.current.close?.();
              } catch (e) {
                console.warn("[useHostCallMedia] Failed to close old consumer:", e);
              }
              consumerRef.current = null;
              currentProducerIdRef.current = null;
              
              // Clear processed IDs to allow new consumer creation
              processedConsumerIdsRef.current.clear();
            }
            
            // Create consumer for the new producer
            console.log("[useHostCallMedia] Creating consumer for user's producer:", msg.producerId);
            currentProducerIdRef.current = msg.producerId;
            
            if (recvTransportRef.current && deviceRef.current) {
              socket.emit("CONSUME", {
                  type: "CONSUME",
                  producerId: msg.producerId,
                  rtpCapabilities: deviceRef.current.rtpCapabilities,
                  roomId,
              });
            } else {
              pendingConsumeRef.current.push({ producerId: msg.producerId, userId: msg.userId });
            }
          }

          if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
            const params = msg.params || msg;
            const consumerId = params.id;
            
            console.log("[useHostCallMedia] CONSUMER event received:", msg.type, "Consumer ID:", consumerId);
            
            // Skip if we already processed this consumer ID
            if (processedConsumerIdsRef.current.has(consumerId)) {
              console.log("[useHostCallMedia] Consumer", consumerId, "already processed, skipping event:", msg.type);
              return;
            }
            
            // Mark as being processed
            processedConsumerIdsRef.current.add(consumerId);
            
            if (!recvTransportRef.current || !deviceRef.current) return;
            
            try {
              console.log("[useHostCallMedia] Creating consumer for user audio:", consumerId);
              
              const consumer = await recvTransportRef.current.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind ?? "audio",
                rtpParameters: params.rtpParameters,
              });
              
              consumerRef.current = consumer;
              await consumer.resume?.();
              
              // Ensure track is enabled
              consumer.track.enabled = true;
              
              const stream = new MediaStream([consumer.track]);
              
              // Set the remote stream so it can be rendered with RTCView
              setRemoteStream(stream);
              
              console.log("[useHostCallMedia] host consuming user audio", {
                consumerId: consumer?.id,
                trackState: consumer?.track?.readyState,
                trackEnabled: consumer?.track?.enabled,
                streamId: stream.id,
              });
              
              // Force audio routing to speaker - AGGRESSIVE approach for iOS
              try {
                console.log("[useHostCallMedia] Forcing speaker for user audio...");
                
                // Call multiple times with delays to ensure it takes effect on iOS
                startCallAudio();
                enableSpeakerphone();
                
                // Wait a bit and try again (iOS sometimes needs this)
                setTimeout(() => {
                  console.log("[useHostCallMedia] Re-enabling speakerphone (iOS fix)");
                  enableSpeakerphone();
                }, 100);
                
                setTimeout(() => {
                  console.log("[useHostCallMedia] Re-enabling speakerphone again (iOS fix)");
                  enableSpeakerphone();
                }, 300);
                
                // Additional mobile-specific routing
                if (isMobilePlatform) {
                  await (mediaDevices as any).setSpeakerphoneOn?.(true);
                  console.log("[useHostCallMedia] mediaDevices.setSpeakerphoneOn(true) called");
                }
                
                console.log("[useHostCallMedia] Speakerphone routing complete");
              } catch (e) {
                console.warn("[useHostCallMedia] Audio routing error:", e);
              }
            } catch (err: any) {
              // Remove from processed set if failed
              processedConsumerIdsRef.current.delete(consumerId);
              
              // Ignore SessionDescription NULL errors (transient)
              if (err?.message?.includes("SessionDescription is NULL")) {
                console.log("[useHostCallMedia] Ignoring SessionDescription NULL error (audio already working)");
                return;
              }
              console.warn("[useHostCallMedia] consume failed", err);
            }
          }

          if (msg.type === "USER_SPEAKING_STATUS") {
            const key = msg.userId || msg.id;
            if (key) {
              onSpeakingStatus?.(key, !!msg.speaking);
            }
          }

          if ((msg.type === "PRODUCER_CREATED" || msg.type === "PRODUCED") && pendingProduceResolve.current) {
            const producerId = msg.producerId || msg.id;
            pendingProduceResolve.current(producerId);
            pendingProduceResolve.current = null;
            console.log("[useHostCallMedia] PRODUCER_CREATED", producerId);
          }
        } catch (e) {
          console.warn("[useHostCallMedia] message parse error", e);
        }
      };

      // Listen for all message types
      socket.on("message", handleMessage);
      socket.on("TURN_CONFIG", handleMessage);
      socket.on("ROUTER_CAPS", handleMessage);
      socket.on("SEND_TRANSPORT_CREATED", handleMessage);
      socket.on("RECV_TRANSPORT_CREATED", handleMessage);
      socket.on("NEW_PRODUCER", handleMessage);
      socket.on("CONSUMER_CREATED", handleMessage);
      socket.on("CONSUMED", handleMessage);
      socket.on("PRODUCER_CREATED", handleMessage);
      socket.on("PRODUCED", handleMessage);
      socket.on("USER_SPEAKING_STATUS", handleMessage);
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [token, role, call?.roomId, cleanup, onSpeakingStatus]);

  const doProduce = useCallback(
    async (socket: Socket, transport: any, device: Device, roomId: string) => {
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

  const createRecvTransport = useCallback(
    async (socket: Socket, params: any) => {
      const roomId = call?.roomId ?? "main-room";

      const device = deviceRef.current || createDevice();
      if (!deviceRef.current) {
        await device.load({ routerRtpCapabilities: routerCapsRef.current });
        deviceRef.current = device;
      }

      const transport = device.createRecvTransport({
        ...params,
        iceServers: turnConfigRef.current?.iceServers,
      });
      recvTransportRef.current = transport;

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit("CONNECT_RECV_TRANSPORT", { type: "CONNECT_RECV_TRANSPORT", dtlsParameters, roomId });
          callback();
        } catch (err) {
          console.warn("[useHostCallMedia] connect recv failed", err);
          errback?.(err as any);
        }
      });
      transport.on("connectionstatechange", (state: any) => {
          console.log("[useHostCallMedia] recv transport state", state);
          if ((state === "failed" || state === "disconnected") && !restartingRef.current) {
            restartingRef.current = true;
            cleanup();
            setTimeout(() => {
              restartingRef.current = false;
              if (!cancelled && token && role === "host" && call?.roomId) {
                start();
              }
            }, 300);
          }
      });

      const pending = [...pendingConsumeRef.current];
      pendingConsumeRef.current = [];
      pending.forEach(({ producerId }) => {
        socket.emit("CONSUME", {
            type: "CONSUME",
            producerId,
            rtpCapabilities: device.rtpCapabilities,
            roomId,
        });
      });
    },
    [call?.roomId, createDevice],
  );

  const createSendTransport = useCallback(
    async (socket: Socket, params: any) => {
      const roomId = call?.roomId ?? "main-room";
      const relayCandidates = (params.iceCandidates || []).filter((c: any) => (c.type || "").toLowerCase() === "relay");
      const useRelayOnly = relayCandidates.length > 0;
      const transportParams = useRelayOnly ? { ...params, iceCandidates: relayCandidates } : params;
      console.log("[useHostCallMedia] creating send transport", {
        relayOnly: useRelayOnly,
        iceCount: (transportParams.iceCandidates || []).length,
        hasTurn: !!turnConfigRef.current,
      });

      const device = createDevice();
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
          socket.emit("CONNECT_SEND_TRANSPORT", {
              type: "CONNECT_SEND_TRANSPORT",
              dtlsParameters,
              roomId,
          });
          callback();
        } catch (err) {
          console.warn("[useHostCallMedia] connect send failed", err);
          errback?.(err as any);
        }
      });

      transport.on("connectionstatechange", (state: any) => {
        console.log("[useHostCallMedia] send transport state", state);
        if ((state === "failed" || state === "disconnected") && !restartingRef.current) {
          setError("Send transport failed");
          setState("error");
          restartingRef.current = true;
          cleanup();
          setTimeout(() => {
            restartingRef.current = false;
            if (token && role === "host" && call?.roomId) {
              start();
            }
          }, 300);
        }
      });

      transport.on("produce", ({ kind, rtpParameters }, callback) => {
        pendingProduceResolve.current = (id: string) => callback({ id });
        console.log("[useHostCallMedia] producing kind", kind, "room", roomId);
        socket.emit("PRODUCE", {
            type: "PRODUCE",
            kind,
            rtpParameters,
            roomId,
        });
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
          void doProduce(socket, transport, device, roomId);
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

  const emitHostMicStatus = useCallback((muted: boolean) => {
    if (socketRef.current && call?.roomId) {
      socketRef.current.emit("HOST_MIC_STATUS", {
        type: "HOST_MIC_STATUS",
        muted,
        roomId: call.roomId,
      });
    }
  }, [call?.roomId]);

  return { state, error, micEnabled, setMicEnabled: toggleMic, remoteStream, emitHostMicStatus };
}

