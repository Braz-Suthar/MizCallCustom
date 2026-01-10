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
  const pendingConsumeRef = useRef<Array<{ producerId: string }>>([]);
  const creatingConsumerRef = useRef(false); // Guard against simultaneous consumer creation

  const cleanupCallMedia = useCallback(() => {
    console.log("[useHostCallMedia] Starting cleanup...");
    
    // Close consumer
    try {
      if (consumerRef.current) {
        console.log("[useHostCallMedia] Closing consumer");
        consumerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing consumer:", e);
    }
    consumerRef.current = null;
    
    // Close producer
    try {
      if (producerRef.current) {
        console.log("[useHostCallMedia] Closing producer");
        producerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing producer:", e);
    }
    producerRef.current = null;
    
    // Close transports
    try {
      if (sendTransportRef.current) {
        console.log("[useHostCallMedia] Closing send transport");
        sendTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    try {
      if (recvTransportRef.current) {
        console.log("[useHostCallMedia] Closing recv transport");
        recvTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useHostCallMedia] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    // Stop media tracks
    if (micStreamRef.current) {
      console.log("[useHostCallMedia] Stopping microphone tracks");
      micStreamRef.current.getTracks?.().forEach((t) => {
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
    
    // Cleanup socket - DISCONNECT IT (like desktop does)
    if (socketRef.current) {
      console.log("[useHostCallMedia] Cleaning up socket");
      if (call?.roomId) {
        socketRef.current.emit?.("CALL_STOPPED", { roomId: call.roomId });
      }
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect?.();
    }
    socketRef.current = null;
    
    // Clear device and refs
    deviceRef.current = null;
    routerCapsRef.current = null;
    pendingConsumeRef.current = [];
    creatingConsumerRef.current = false; // Reset consumer creation guard
    
    // Reset state
    setState("idle");
    setError(null);
    
    console.log("[useHostCallMedia] ✅ Cleanup complete");
  }, [call?.roomId]);

  useEffect(() => cleanupCallMedia, [cleanupCallMedia]);

  useEffect(() => {
    if (!token || role !== "host" || !call?.roomId) {
      console.log("[useHostCallMedia] No call or not authorized");
      return;
    }

    // DESKTOP PATTERN: Create fresh socket on every join
    const joinActiveCall = async () => {
      // Clean up first (like desktop does)
      cleanupCallMedia();
      
      setState("connecting");
      setError(null);
      
      // Store router caps from call state (like desktop)
      routerCapsRef.current = call.routerRtpCapabilities ?? null;
      
      console.log("[useHostCallMedia] joinActiveCall", {
        role,
        roomId: call.roomId,
        hasCaps: !!routerCapsRef.current,
      });

      // Create NEW socket (like desktop does)
      const ws: Socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: false,  // Desktop doesn't auto-reconnect
      });
      socketRef.current = ws;

      // Helper functions (like desktop has)
      const drainPendingConsumes = () => {
        if (!recvTransportRef.current || !deviceRef.current || !ws) return;
        const pending = [...pendingConsumeRef.current];
        pendingConsumeRef.current = [];
        
        // Deduplicate by producerId
        const uniqueProducers = Array.from(new Set(pending.map(p => p.producerId)));
        console.log("[useHostCallMedia] Draining", uniqueProducers.length, "unique pending consumes (was", pending.length, ")");
        
        uniqueProducers.forEach((producerId) => {
          console.log("[useHostCallMedia] Draining pending consume:", producerId);
          ws.emit("CONSUME", {
            type: "CONSUME",
            producerId,
            rtpCapabilities: deviceRef.current?.rtpCapabilities,
            roomId: call.roomId,
          });
        });
      };

      const requestConsume = (producerId: string) => {
        if (!ws) {
          console.warn("[useHostCallMedia] No socket, cannot consume:", producerId);
          return;
        }
        if (!recvTransportRef.current || !deviceRef.current) {
          // Check if already queued to avoid duplicates
          const alreadyQueued = pendingConsumeRef.current.some(p => p.producerId === producerId);
          if (alreadyQueued) {
            console.log("[useHostCallMedia] Producer already queued, skipping:", producerId);
            return;
          }
          console.log("[useHostCallMedia] Recv transport not ready, queueing consume:", producerId);
          pendingConsumeRef.current.push({ producerId });
          return;
        }
        console.log("[useHostCallMedia] Requesting consume for producer:", producerId, {
          hasRecvTransport: !!recvTransportRef.current,
          hasDevice: !!deviceRef.current,
          roomId: call.roomId
        });
        ws.emit("CONSUME", {
          type: "CONSUME",
          producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
          roomId: call.roomId,
        });
      };

      ws.on("connect", () => {
        console.log("[useHostCallMedia] Socket connected:", ws.id);
        ws.emit("AUTH", { token });
        ws.emit("CALL_STARTED", { roomId: call.roomId });
        ws.emit("GET_ROUTER_CAPS", { roomId: call.roomId });
        ws.emit("JOIN", { token, roomId: call.roomId });
      });

      ws.on("connect_error", (err) => {
        console.warn("[useHostCallMedia] Socket error:", err);
        setState("error");
        setError("Socket error");
      });

      ws.on("disconnect", () => {
        console.log("[useHostCallMedia] Socket disconnected");
        // Don't change state if already connected (allows brief disconnects)
      });

      const ensureDeviceLoaded = async () => {
        if (deviceRef.current) return deviceRef.current;
        const caps = routerCapsRef.current;
        if (!caps) throw new Error("Missing router capabilities");
        const device = new Device({ 
          handlerName: Platform.OS === "ios" || Platform.OS === "android" ? "ReactNative106" as any : undefined 
        });
        await device.load({ routerRtpCapabilities: caps });
        deviceRef.current = device;
        return device;
      };

      const startHostProducer = async () => {
        if (producerRef.current || !sendTransportRef.current) return;
        try {
          console.log("[useHostCallMedia] Starting host producer...");
          
          if (Platform.OS === "android") {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              throw new Error("Microphone permission denied");
            }
          }

          const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
          micStreamRef.current = stream;
          const track = stream.getAudioTracks()[0] as any;
          const producer = await sendTransportRef.current.produce({ track });
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
      };

      const handleMsg = async (msgRaw: any) => {
        try {
          const msg = msgRaw || {};
          console.log("[useHostCallMedia] message", msg.type);

          if (msg.type === "ROUTER_CAPS") {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }

          if (msg.type === "SEND_TRANSPORT_CREATED") {
            // Skip if we already have a fresh send transport
            if (sendTransportRef.current && !producerRef.current) {
              console.log("[useHostCallMedia] Send transport already exists, skipping duplicate");
              return;
            }
            
            const device = await ensureDeviceLoaded();
            const transport = device.createSendTransport(msg.params);
            
            transport.on("connect", ({ dtlsParameters }, callback, errback) => {
              try {
                console.log("[useHostCallMedia] Send transport connecting...");
                ws.emit("CONNECT_SEND_TRANSPORT", { 
                  type: "CONNECT_SEND_TRANSPORT",
                  dtlsParameters, 
                  roomId: call.roomId 
                });
                callback();
              } catch (err) {
                console.error("[useHostCallMedia] Send transport connect error:", err);
                errback?.(err as Error);
              }
            });
            
            transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
              try {
                console.log("[useHostCallMedia] Producing", kind, "for room:", call.roomId);
                ws.emit("PRODUCE", { 
                  type: "PRODUCE",
                  kind, 
                  rtpParameters, 
                  roomId: call.roomId 
                });
                const randomId = `${Date.now()}-${Math.random()}`;
                callback({ id: randomId });
              } catch (err) {
                console.error("[useHostCallMedia] Produce emit error:", err);
                errback?.(err as Error);
              }
            });
            
            sendTransportRef.current = transport;
            
            // Start host producer immediately (like desktop)
            startHostProducer();
            setState("connected");
            setError(null);
          }

          if (msg.type === "RECV_TRANSPORT_CREATED") {
            // Skip if we already have a fresh recv transport in new/connecting state
            const currentState = recvTransportRef.current?.connectionState;
            if (recvTransportRef.current && (currentState === "new" || currentState === "connecting")) {
              console.log("[useHostCallMedia] Recv transport already exists in state:", currentState, "- skipping duplicate creation");
              return;
            }
            
            // Close old transport if it exists (should have been closed in NEW_PRODUCER handler)
            if (recvTransportRef.current) {
              console.log("[useHostCallMedia] Closing previous recv transport in state:", currentState);
              try {
                recvTransportRef.current.close?.();
              } catch {}
              recvTransportRef.current = null;
            }
            
            const device = await ensureDeviceLoaded();
            const transport = device.createRecvTransport(msg.params);
            
            transport.on("connect", ({ dtlsParameters }, callback, errback) => {
              try {
                console.log("[useHostCallMedia] Recv transport connecting...");
                ws.emit("CONNECT_RECV_TRANSPORT", { 
                  type: "CONNECT_RECV_TRANSPORT",
                  dtlsParameters, 
                  roomId: call.roomId 
                });
                callback();
              } catch (err) {
                console.error("[useHostCallMedia] Recv transport connect error:", err);
                errback?.(err as Error);
              }
            });
            
            recvTransportRef.current = transport;
            console.log("[useHostCallMedia] ✅ Fresh recv transport created");
            setState("connected");
            setError(null);
            drainPendingConsumes();
          }

          if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "user") {
            console.log("[useHostCallMedia] NEW_PRODUCER from user:", {
              producerId: msg.producerId,
              userId: msg.userId,
              hasRecvTransport: !!recvTransportRef.current,
              recvTransportState: recvTransportRef.current?.connectionState,
              hasDevice: !!deviceRef.current,
              hasPendingConsumes: pendingConsumeRef.current.length
            });
            
            // Detect stale transport (already connected to previous user session)
            const transportState = recvTransportRef.current?.connectionState;
            if (recvTransportRef.current && (transportState === "connected" || transportState === "failed" || transportState === "disconnected")) {
              console.log("[useHostCallMedia] ⚠️ Recv transport in stale state:", transportState, "- closing and requesting fresh transport");
              
              // Close stale transport and consumer
              try {
                recvTransportRef.current.close?.();
              } catch (e) {
                console.warn("[useHostCallMedia] Error closing stale recv transport:", e);
              }
              recvTransportRef.current = null;
              
              if (consumerRef.current) {
                try {
                  consumerRef.current.close?.();
                } catch (e) {
                  console.warn("[useHostCallMedia] Error closing stale consumer:", e);
                }
                consumerRef.current = null;
              }
              
              // Queue this consume and request fresh recv transport
              pendingConsumeRef.current.push({ producerId: msg.producerId });
              console.log("[useHostCallMedia] Requesting fresh RECV transport via JOIN");
              ws.emit("JOIN", { type: "JOIN", token, roomId: call.roomId });
              return;
            }
            
            requestConsume(msg.producerId);
          }

          if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
            if (!recvTransportRef.current) {
              console.warn("[useHostCallMedia] No recv transport for CONSUMED event");
              return;
            }
            
            const params = msg.params || msg;
            console.log("[useHostCallMedia] CONSUMED event:", {
              consumerId: params.id,
              producerId: params.producerId,
              kind: params.kind,
              hasRtpParams: !!params.rtpParameters,
              currentConsumerId: consumerRef.current?.id,
              alreadyCreating: creatingConsumerRef.current
            });
            
            // Skip if we're already creating a consumer (prevents race conditions)
            if (creatingConsumerRef.current) {
              console.log("[useHostCallMedia] Already creating consumer, skipping duplicate CONSUMED event");
              return;
            }
            
            // Skip if we're already processing this exact consumer ID (duplicate event)
            if (consumerRef.current && consumerRef.current.id === params.id) {
              console.log("[useHostCallMedia] Skipping duplicate CONSUMED event for same consumer:", params.id);
              return;
            }
            
            creatingConsumerRef.current = true; // Mark as creating
            
            try {
              // Close old consumer if exists and it's a different one
              if (consumerRef.current && consumerRef.current.id !== params.id) {
                console.log("[useHostCallMedia] Closing old consumer:", consumerRef.current.id, "-> new:", params.id);
                try {
                  consumerRef.current.close?.();
                } catch (e) {
                  console.warn("[useHostCallMedia] Error closing old consumer:", e);
                }
              }
              
              console.log("[useHostCallMedia] Creating consumer for user audio...");
              const consumer = await recvTransportRef.current.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind ?? "audio",
                rtpParameters: params.rtpParameters,
              });
              
              consumerRef.current = consumer;
              console.log("[useHostCallMedia] Consumer created, resuming...");
              await consumer.resume?.();
              consumer.track.enabled = true;
              
              const stream = new MediaStream([consumer.track]);
              setRemoteStream(stream);
              
              console.log("[useHostCallMedia] ✅ User audio consumed successfully", {
                consumerId: consumer.id,
                producerId: params.producerId,
                trackState: consumer.track.readyState,
                trackEnabled: consumer.track.enabled,
              });
              
              try {
                startCallAudio();
                enableSpeakerphone();
                if (isMobilePlatform) {
                  await (mediaDevices as any).setSpeakerphoneOn?.(true);
                }
                console.log("[useHostCallMedia] Audio routing complete");
              } catch (e) {
                console.warn("[useHostCallMedia] Audio routing error:", e);
              }
            } catch (e: any) {
              console.error("[useHostCallMedia] ❌ Error consuming user audio:", e);
              if (e?.message?.includes("SessionDescription is NULL")) {
                console.log("[useHostCallMedia] Ignoring SessionDescription NULL error (likely duplicate event)");
                return;
              }
              setError(e?.message ?? "Failed to consume user audio");
            } finally {
              creatingConsumerRef.current = false; // Reset flag
            }
          }

          if (msg.type === "USER_SPEAKING_STATUS") {
            const userId = msg.userId || msg.id;
            const speaking = msg.speaking;
            if (onSpeakingStatus) {
              onSpeakingStatus(userId, speaking);
            }
          }
        } catch (e) {
          console.warn("[useHostCallMedia] message error", e);
        }
      };

      // Listen ONLY to specific events (not "message") to avoid duplicates
      [
        "ROUTER_CAPS",
        "SEND_TRANSPORT_CREATED",
        "RECV_TRANSPORT_CREATED",
        "NEW_PRODUCER",
        "CONSUMER_CREATED",
        "CONSUMED",
        "USER_SPEAKING_STATUS",
      ].forEach((event) => {
        ws.on(event, (payload) => handleMsg(payload ?? { type: event }));
      });
    };

    joinActiveCall();

    return () => {
      cleanupCallMedia();
    };
  }, [token, role, call?.roomId, call?.routerRtpCapabilities, cleanupCallMedia, onSpeakingStatus, micEnabled, call]);

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
