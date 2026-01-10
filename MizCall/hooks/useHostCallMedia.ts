import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { PermissionsAndroid, Platform } from "react-native";
import { mediaDevices, MediaStream } from "react-native-webrtc";
import { io, Socket } from "socket.io-client";
import { startCallAudio, enableSpeakerphone, stopCallAudio, disableSpeakerphone, isMobilePlatform } from "../utils/callAudio";

import { ActiveCall } from "../state/callSlice";

const SOCKET_URL = "https://custom.mizcall.com";

type MediaState = "idle" | "connecting" | "connected" | "error";

export function useHostCallMedia(opts: { 
  token: string | null; 
  role: string | null; 
  call: ActiveCall | null;
  onSpeakingStatus?: (userId: string | undefined, speaking: boolean) => void;
}) {
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
  const producerRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const routerCapsRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    console.log("[useHostCallMedia] Starting cleanup...");
    
    if (socketRef.current) {
      console.log("[useHostCallMedia] Disconnecting socket");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    try {
      consumerRef.current?.close?.();
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing consumer:", e);
    }
    consumerRef.current = null;
    
    try {
      producerRef.current?.close?.();
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing producer:", e);
    }
    producerRef.current = null;
    
    try {
      recvTransportRef.current?.close?.();
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    try {
      sendTransportRef.current?.close?.();
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    deviceRef.current = null;
    routerCapsRef.current = null;
    
    if (micStreamRef.current) {
      console.log("[useHostCallMedia] Stopping microphone tracks");
      micStreamRef.current.getTracks?.().forEach((t) => {
        t.stop();
      });
      micStreamRef.current = null;
    }
    
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch (e) {
      console.warn("[useHostCallMedia] Error stopping call audio:", e);
    }
    
    setRemoteStream(null);
    
    console.log("[useHostCallMedia] ✅ Cleanup complete");
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (!token || role !== "host" || !call?.roomId) {
      console.log("[useHostCallMedia] No call or not authorized, cleaning up");
      cleanup();
      setState("idle");
      setError(null);
      return;
    }

    if (socketRef.current?.connected) {
      console.log("[useHostCallMedia] Socket already connected, skipping initialization");
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
        auth: { token }
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[useHostCallMedia] Socket.IO connected:", socket.id);
        socket.emit("auth", { type: "auth", token });
        socket.emit("JOIN", { type: "JOIN", token, roomId: call.roomId });
        socket.emit("CALL_STARTED", { type: "CALL_STARTED", roomId: call.roomId });
        socket.emit("GET_ROUTER_CAPS", { type: "GET_ROUTER_CAPS", roomId: call.roomId });
      });

      socket.on("disconnect", (reason) => {
        console.log("[useHostCallMedia] Socket.IO disconnected:", reason);
      });

      socket.on("connect_error", (error) => {
        console.log("[useHostCallMedia] Connection error:", error.message);
        if (!cancelled) {
          setError("Connection error");
          setState("error");
        }
      });

      const handleMsg = async (msgRaw: any) => {
        try {
          const msg = msgRaw || {};
          console.log("[useHostCallMedia] message", msg.type);

          if (msg.type === "ROUTER_CAPS") {
            routerCapsRef.current = msg.routerRtpCapabilities;
            console.log("[useHostCallMedia] Router caps received");
          }

          if (msg.type === "SEND_TRANSPORT_CREATED") {
            if (sendTransportRef.current) {
              console.log("[useHostCallMedia] Send transport already exists, skipping");
              return;
            }

            const device = new Device({ handlerName: Platform.OS === "ios" || Platform.OS === "android" ? "ReactNative106" as any : undefined });
            
            // Load device with router caps from ref (populated by ROUTER_CAPS message)
            if (!routerCapsRef.current) {
              console.error("[useHostCallMedia] Missing router caps for device load");
              return;
            }
            
            await device.load({ routerRtpCapabilities: routerCapsRef.current });
            deviceRef.current = device;
            
            const transport = device.createSendTransport(msg.params);
            sendTransportRef.current = transport;

            transport.on("connect", ({ dtlsParameters }, callback) => {
              socket.emit("CONNECT_SEND_TRANSPORT", { dtlsParameters, roomId: call.roomId });
              callback();
            });

            transport.on("produce", ({ kind, rtpParameters }, callback) => {
              socket.emit("PRODUCE", { kind, rtpParameters, roomId: call.roomId });
              const randomId = `${Date.now()}-${Math.random()}`;
              callback({ id: randomId });
            });

            // Start host producer immediately
            if (!producerRef.current) {
              try {
                if (Platform.OS === "android") {
                  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
                  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    throw new Error("Microphone permission denied");
                  }
                }

                const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
                micStreamRef.current = stream;
                const track = stream.getAudioTracks()[0] as any;
                const producer = await transport.produce({ track });
                producerRef.current = producer;
                track.enabled = micEnabled;
                setState("connected");
                setError(null);
                console.log("[useHostCallMedia] Host producer created");
              } catch (err: any) {
                console.warn("[useHostCallMedia] Host produce error", err);
                setError("Microphone failed");
                setState("error");
              }
            }
          }

          if (msg.type === "RECV_TRANSPORT_CREATED") {
            if (recvTransportRef.current) {
              console.log("[useHostCallMedia] Recv transport already exists, skipping");
              return;
            }

            const device = deviceRef.current || new Device({ handlerName: Platform.OS === "ios" || Platform.OS === "android" ? "ReactNative106" as any : undefined });
            
            if (!device.loaded) {
              if (!routerCapsRef.current) {
                console.error("[useHostCallMedia] Missing router caps for recv device load");
                return;
              }
              await device.load({ routerRtpCapabilities: routerCapsRef.current });
              deviceRef.current = device;
            }

            const transport = device.createRecvTransport(msg.params);
            recvTransportRef.current = transport;

            transport.on("connect", ({ dtlsParameters }, callback) => {
              socket.emit("CONNECT_RECV_TRANSPORT", { dtlsParameters, roomId: call.roomId });
              callback();
            });

            setState("connected");
            setError(null);
          }

          if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "user") {
            console.log("[useHostCallMedia] NEW_PRODUCER from user:", msg.producerId, "userId:", msg.userId);
            
            if (!recvTransportRef.current || !deviceRef.current) {
              console.warn("[useHostCallMedia] Recv transport not ready for consume");
              return;
            }

            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: msg.producerId,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
              roomId: call.roomId,
            });
          }

          if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
            if (!recvTransportRef.current) return;
            
            const params = msg.params || msg;
            console.log("[useHostCallMedia] CONSUMED", params.id);
            
            try {
              consumerRef.current?.close?.();
            } catch {}
            
            const consumer = await recvTransportRef.current.consume({
              id: params.id,
              producerId: params.producerId,
              kind: params.kind ?? "audio",
              rtpParameters: params.rtpParameters,
            });
            
            consumerRef.current = consumer;
            await consumer.resume?.();
            consumer.track.enabled = true;
            
            const stream = new MediaStream([consumer.track]);
            setRemoteStream(stream);
            
            console.log("[useHostCallMedia] User audio consumed", {
              consumerId: consumer.id,
              trackState: consumer.track.readyState,
              trackEnabled: consumer.track.enabled,
            });
            
            try {
              startCallAudio();
              enableSpeakerphone();
              if (isMobilePlatform) {
                await (mediaDevices as any).setSpeakerphoneOn?.(true);
              }
            } catch (e) {
              console.warn("[useHostCallMedia] Audio routing error:", e);
            }
          }

          if (msg.type === "USER_SPEAKING_STATUS") {
            const userId = msg.userId || msg.id;
            const speaking = msg.speaking;
            console.log("[useHostCallMedia] USER_SPEAKING_STATUS", { userId, speaking });
            if (onSpeakingStatus) {
              onSpeakingStatus(userId, speaking);
            }
          }
        } catch (e) {
          console.warn("[useHostCallMedia] message error", e);
        }
      };

      socket.on("message", handleMsg);
      [
        "ROUTER_CAPS",
        "SEND_TRANSPORT_CREATED",
        "RECV_TRANSPORT_CREATED",
        "NEW_PRODUCER",
        "CONSUMER_CREATED",
        "CONSUMED",
        "USER_SPEAKING_STATUS",
      ].forEach((event) => {
        socket.on(event, (payload) => handleMsg(payload ?? { type: event }));
      });
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [token, role, call?.roomId, cleanup, onSpeakingStatus, micEnabled, call]);

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
