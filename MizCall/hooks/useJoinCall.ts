import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
type RtpCapabilities = any;
import { MediaStream, mediaDevices } from "react-native-webrtc";
import { io, Socket } from "socket.io-client";
import Toast from "react-native-toast-message";

import { useAppSelector, useAppDispatch } from "../state/store";
import { clearActiveCall } from "../state/callSlice";
import { disableSpeakerphone, enableSpeakerphone, isMobilePlatform, startCallAudio, stopCallAudio } from "../utils/callAudio";

const SOCKET_URL = "https://custom.mizcall.com";

type JoinState = "idle" | "connecting" | "connected" | "error";

export function useJoinCall() {
  const { token, role } = useAppSelector((s) => s.auth);
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const dispatch = useAppDispatch();
  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [pttReady, setPttReady] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const roomId = activeCall?.roomId || (activeCall as any)?.id;

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const recvTransportRef = useRef<any>(null);
  const sendTransportRef = useRef<any>(null);
  const producerRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const hostProducerIdRef = useRef<string | null>(null);
  const routerCapsRef = useRef<any>(null);
  const pendingConsumeRef = useRef<Array<{ producerId: string }>>([]);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zeroLevelCountRef = useRef(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const creatingConsumerRef = useRef(false); // Guard against simultaneous consumer creation

  const cleanupCallMedia = useCallback(() => {
    console.log("[useJoinCall] Starting cleanup...");
    
    // Stop call audio
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch (e) {
      console.warn("[useJoinCall] Error stopping call audio:", e);
    }
    
    // Close consumer
    try {
      if (consumerRef.current) {
        console.log("[useJoinCall] Closing consumer");
        consumerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing consumer:", e);
    }
    consumerRef.current = null;
    
    // Close producer
    try {
      if (producerRef.current) {
        console.log("[useJoinCall] Closing producer");
        producerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing producer:", e);
    }
    producerRef.current = null;
    
    // Close transports
    try {
      if (sendTransportRef.current) {
        console.log("[useJoinCall] Closing send transport");
        sendTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    try {
      if (recvTransportRef.current) {
        console.log("[useJoinCall] Closing recv transport");
        recvTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    // Stop media tracks
    if (localStreamRef.current) {
      console.log("[useJoinCall] Stopping local media tracks");
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear meter interval
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    
    // Clear remote stream
    setRemoteStream(null);
    setAudioLevel(0);
    zeroLevelCountRef.current = 0;
    
    // Cleanup socket - DISCONNECT IT (like desktop does)
    if (socketRef.current) {
      console.log("[useJoinCall] Cleaning up socket");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect?.();
    }
    socketRef.current = null;
    
    // Clear device and refs
    deviceRef.current = null;
    hostProducerIdRef.current = null;
    routerCapsRef.current = null;
    pendingConsumeRef.current = [];
    creatingConsumerRef.current = false; // Reset consumer creation guard
    
    // Reset state
    setState("idle");
    setError(null);
    setPttReady(false);
    setSpeaking(false);
    
    console.log("[useJoinCall] ✅ Cleanup complete");
  }, []);

  useEffect(() => cleanupCallMedia, [cleanupCallMedia]);

  const leave = useCallback(() => {
    console.log("[useJoinCall] leave() called");
    cleanupCallMedia();
  }, [cleanupCallMedia]);

  const join = useCallback(async () => {
    if (!token || role !== "user") {
      setError("Missing auth");
      setState("error");
      return;
    }
    if (!roomId) {
      setError("Missing room");
      setState("error");
      return;
    }
    if (!activeCall?.routerRtpCapabilities || Object.keys(activeCall.routerRtpCapabilities).length === 0) {
      console.error("[useJoinCall] Cannot join: missing router capabilities");
      setError("Waiting for call info");
      setState("idle");
      return;
    }

    // DESKTOP PATTERN: Clean up first, then create fresh socket
    cleanupCallMedia();
    
    setState("connecting");
    setError(null);
    
    // Store router caps from activeCall state (like desktop)
    routerCapsRef.current = activeCall.routerRtpCapabilities ?? null;
    hostProducerIdRef.current = activeCall.hostProducerId || null;
    
    console.log("[useJoinCall] joinActiveCall", {
      role,
      roomId,
      hasCaps: !!routerCapsRef.current,
      hostProducer: hostProducerIdRef.current,
    });

    // Create NEW socket for this call session (like desktop)
    const ws: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: false,  // Desktop doesn't auto-reconnect
    });
    socketRef.current = ws;

    ws.on("connect", () => {
      console.log("[useJoinCall] Socket connected:", ws.id);
      ws.emit("AUTH", { token });
      ws.emit("CALL_STARTED", { roomId });
      ws.emit("GET_ROUTER_CAPS", { roomId });
      ws.emit("JOIN", { token, roomId });
      ws.emit("REQUEST_HOST_PRODUCER", { roomId });
      
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {}
    });

    ws.on("connect_error", (err) => {
      console.warn("[useJoinCall] Socket error:", err);
      setState("error");
      setError("Socket error");
    });

    ws.on("disconnect", () => {
      console.log("[useJoinCall] Socket disconnected");
    });

    const ensureDeviceLoaded = async () => {
      if (deviceRef.current) return deviceRef.current;
      const caps = routerCapsRef.current;
      if (!caps) throw new Error("Missing router capabilities");
      const device = new Device({ handlerName: "ReactNative106" as any });
      await device.load({ routerRtpCapabilities: caps });
      deviceRef.current = device;
      return device;
    };

      const drainPendingConsumes = () => {
        if (!recvTransportRef.current || !deviceRef.current || !ws) return;
        const pending = [...pendingConsumeRef.current];
        pendingConsumeRef.current = [];
        
        // Deduplicate by producerId
        const uniqueProducers = Array.from(new Set(pending.map(p => p.producerId)));
        console.log("[useJoinCall] Draining", uniqueProducers.length, "unique pending consumes (was", pending.length, ")");
        
        uniqueProducers.forEach((producerId) => {
          console.log("[useJoinCall] Draining pending consume:", producerId);
          ws.emit("CONSUME", {
            type: "CONSUME",
            producerId,
            rtpCapabilities: deviceRef.current?.rtpCapabilities,
            roomId,
          });
        });
      };

      const requestConsume = (producerId: string) => {
        if (!ws) {
          console.warn("[useJoinCall] No socket, cannot consume:", producerId);
          return;
        }
        if (!recvTransportRef.current || !deviceRef.current) {
          // Check if already queued to avoid duplicates
          const alreadyQueued = pendingConsumeRef.current.some(p => p.producerId === producerId);
          if (alreadyQueued) {
            console.log("[useJoinCall] Producer already queued, skipping:", producerId);
            return;
          }
          console.log("[useJoinCall] Recv transport not ready, queueing consume:", producerId);
          pendingConsumeRef.current.push({ producerId });
          return;
        }
        console.log("[useJoinCall] Requesting consume for host producer:", producerId, {
          hasRecvTransport: !!recvTransportRef.current,
          hasDevice: !!deviceRef.current,
          roomId
        });
        ws.emit("CONSUME", {
          type: "CONSUME",
          producerId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
          roomId,
        });
      };

    const handleMsg = async (msgRaw: any) => {
      try {
        const msg = msgRaw || {};
        console.log("[useJoinCall] message", msg.type);

        if (msg.type === "ROUTER_CAPS") {
          routerCapsRef.current = msg.routerRtpCapabilities;
          if (!hostProducerIdRef.current && msg.hostProducerId) {
            hostProducerIdRef.current = msg.hostProducerId;
            requestConsume(msg.hostProducerId);
          } else if (!msg.hostProducerId) {
            console.log("[useJoinCall] ROUTER_CAPS missing host producer; requesting");
            ws.emit("REQUEST_HOST_PRODUCER", { roomId });
          }
        }

        if (msg.type === "SEND_TRANSPORT_CREATED") {
          // Skip if we already have a send transport
          if (sendTransportRef.current) {
            console.log("[useJoinCall] Send transport already exists, skipping duplicate");
            return;
          }
          
          const device = await ensureDeviceLoaded();
          const transport = device.createSendTransport(msg.params);
          
          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
            try {
              console.log("[useJoinCall] Send transport connecting...");
              ws.emit("CONNECT_SEND_TRANSPORT", { 
                type: "CONNECT_SEND_TRANSPORT",
                dtlsParameters, 
                roomId 
              });
              callback();
            } catch (err) {
              console.error("[useJoinCall] Send transport connect error:", err);
              errback?.(err as Error);
            }
          });
          
          transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
            try {
              console.log("[useJoinCall] Producing", kind, "for room:", roomId);
              ws.emit("PRODUCE", { 
                type: "PRODUCE",
                kind, 
                rtpParameters, 
                roomId 
              });
              const randomId = `${Date.now()}-${Math.random()}`;
              callback({ id: randomId });
            } catch (err) {
              console.error("[useJoinCall] Produce emit error:", err);
              errback?.(err as Error);
            }
          });
          
          sendTransportRef.current = transport;
          setPttReady(true);
        }

        if (msg.type === "RECV_TRANSPORT_CREATED") {
          // Skip if we already have a recv transport
          if (recvTransportRef.current) {
            console.log("[useJoinCall] Recv transport already exists, skipping duplicate");
            return;
          }
          
          const device = await ensureDeviceLoaded();
          const transport = device.createRecvTransport(msg.params);
          
          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
            try {
              console.log("[useJoinCall] Recv transport connecting...");
              ws.emit("CONNECT_RECV_TRANSPORT", { 
                type: "CONNECT_RECV_TRANSPORT",
                dtlsParameters, 
                roomId 
              });
              callback();
            } catch (err) {
              console.error("[useJoinCall] Recv transport connect error:", err);
              errback?.(err as Error);
            }
          });

          transport.on("connectionstatechange", (state) => {
            console.log("[useJoinCall] recv transport state:", state);
          });
          
          recvTransportRef.current = transport;
          
          if (hostProducerIdRef.current) {
            console.log("[useJoinCall] Consuming host producer", hostProducerIdRef.current);
            requestConsume(hostProducerIdRef.current);
          } else {
            console.log("[useJoinCall] RECV created; requesting host producer");
            ws.emit("REQUEST_HOST_PRODUCER", { roomId });
          }
          
          setState("connected");
          setError(null);
          drainPendingConsumes();
        }

        if (msg.type === "HOST_PRODUCER") {
          hostProducerIdRef.current = msg.producerId;
          console.log("[useJoinCall] HOST_PRODUCER received", msg.producerId);
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }
          if (msg.producerId) {
            requestConsume(msg.producerId);
          }
        }

        if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "host") {
          console.log("[useJoinCall] NEW_PRODUCER from host:", msg.producerId);
          hostProducerIdRef.current = msg.producerId;
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }
          requestConsume(msg.producerId);
        }

        if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
          if (!recvTransportRef.current) {
            console.warn("[useJoinCall] No recv transport for CONSUMED event");
            return;
          }
          
          const params = msg.params || msg;
          console.log("[useJoinCall] CONSUMED event:", {
            consumerId: params.id,
            producerId: params.producerId,
            kind: params.kind,
            hasRtpParams: !!params.rtpParameters,
            currentConsumerId: consumerRef.current?.id,
            alreadyCreating: creatingConsumerRef.current
          });
          
          // Skip if we're already creating a consumer (prevents race conditions)
          if (creatingConsumerRef.current) {
            console.log("[useJoinCall] Already creating consumer, skipping duplicate CONSUMED event");
            return;
          }
          
          // Skip if we're already processing this exact consumer ID (duplicate event)
          if (consumerRef.current && consumerRef.current.id === params.id) {
            console.log("[useJoinCall] Skipping duplicate CONSUMED event for same consumer:", params.id);
            return;
          }
          
          creatingConsumerRef.current = true; // Mark as creating
          
          try {
            // Close old consumer if exists and it's a different one
            if (consumerRef.current && consumerRef.current.id !== params.id) {
              console.log("[useJoinCall] Closing old consumer:", consumerRef.current.id, "-> new:", params.id);
              try {
                consumerRef.current.close?.();
              } catch (e) {
                console.warn("[useJoinCall] Error closing old consumer:", e);
              }
            }
            
            console.log("[useJoinCall] Creating consumer for host audio...");
            const consumer = await recvTransportRef.current.consume({
              id: params.id,
              producerId: params.producerId,
              kind: params.kind ?? "audio",
              rtpParameters: params.rtpParameters,
            });
            
            consumerRef.current = consumer;
            console.log("[useJoinCall] Consumer created, resuming...");
            await consumer.resume?.();
            
            const track = consumer.track as any;
            if (track) {
              track.enabled = true;
              track.onended = () => console.log("[useJoinCall] consumer track ended");
              track.onmute = () => console.log("[useJoinCall] consumer track mute");
              track.onunmute = () => console.log("[useJoinCall] consumer track unmute");
            }
            
            const stream = new MediaStream([consumer.track]);
            setRemoteStream(stream);
            
            console.log("[useJoinCall] ✅ Host audio consumed successfully", {
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
              console.log("[useJoinCall] Audio routing complete");
            } catch (e) {
              console.warn("[useJoinCall] Error enabling audio:", e);
            }
            
            // Start audio level meter
            if (!meterIntervalRef.current) {
              meterIntervalRef.current = setInterval(async () => {
                try {
                  const stats = await consumerRef.current?.getStats?.();
                  if (!stats) return;
                  let level = 0;
                  stats.forEach((report: any) => {
                    if (report.type === "inbound-rtp" || report.type === "track" || report.type === "remote-inbound-rtp") {
                      if (typeof report.audioLevel === "number") {
                        level = Math.max(level, report.audioLevel);
                      }
                      if (
                        typeof report.totalAudioEnergy === "number" &&
                        typeof report.totalSamplesDuration === "number" &&
                        report.totalSamplesDuration > 0
                      ) {
                        const energy = report.totalAudioEnergy / report.totalSamplesDuration;
                        level = Math.max(level, Math.sqrt(energy));
                      }
                    }
                  });
                  if (level === 0) {
                    zeroLevelCountRef.current += 1;
                    if (zeroLevelCountRef.current === 4) {
                      console.log("[useJoinCall] inbound stats sample", Array.from(stats.values?.() ?? stats));
                    }
                  } else {
                    zeroLevelCountRef.current = 0;
                  }
                  setAudioLevel(level);
                } catch {}
              }, 700);
            }
            
            setState("connected");
            setError(null);
            console.log("[useJoinCall] ✅ Consumer setup complete, state set to connected");
          } catch (e: any) {
            console.error("[useJoinCall] ❌ Error consuming host audio:", e);
            if (e?.message?.includes("SessionDescription is NULL")) {
              console.log("[useJoinCall] Ignoring SessionDescription NULL error (likely duplicate event)");
              return;
            }
            setError(e?.message ?? "Failed to consume host audio");
            setState("error");
          } finally {
            creatingConsumerRef.current = false; // Reset flag
          }
        }

        if (msg.type === "CALL_STOPPED" || msg.type === "call-stopped") {
          console.log("[useJoinCall] Call stopped by host");
          setCallEnded(true);
          
          Toast.show({
            type: "info",
            text1: "Call Ended",
            text2: "The call has been ended by the host",
            position: "top",
            visibilityTime: 3000,
            topOffset: 48,
          });
          
          dispatch(clearActiveCall());
        }
      } catch (e) {
        console.warn("[useJoinCall] message error:", e);
      }
    };

    // Listen ONLY to specific events (not "message") to avoid duplicates
    [
      "ROUTER_CAPS",
      "SEND_TRANSPORT_CREATED",
      "RECV_TRANSPORT_CREATED",
      "NEW_PRODUCER",
      "HOST_PRODUCER",
      "CONSUMER_CREATED",
      "CONSUMED",
      "CALL_STOPPED",
      "call-stopped",
    ].forEach((event) => {
      ws.on(event, (payload) => handleMsg(payload ?? { type: event }));
    });
  }, [token, role, activeCall?.routerRtpCapabilities, activeCall?.hostProducerId, dispatch, roomId, activeCall, cleanupCallMedia]);

  const startSpeaking = useCallback(async () => {
    console.log("[useJoinCall] startSpeaking called", {
      pttReady,
      hasSendTransport: !!sendTransportRef.current,
      speaking,
      hasExistingProducer: !!producerRef.current
    });
    
    if (!pttReady || !sendTransportRef.current || speaking) {
      console.warn("[useJoinCall] Cannot start speaking - not ready");
      return;
    }
    
    try {
      // Create producer if doesn't exist
      if (!producerRef.current) {
        console.log("[useJoinCall] Creating NEW producer for speaking");
        const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        const track = stream.getAudioTracks()[0] as any;
        track.enabled = true;
        
        console.log("[useJoinCall] Calling transport.produce()...");
        producerRef.current = await sendTransportRef.current.produce({ track });
        console.log("[useJoinCall] ✅ Producer created successfully:", producerRef.current.id);
      } else {
        // Enable existing track
        console.log("[useJoinCall] Enabling existing producer track");
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
        }
      }
      
      setSpeaking(true);
      console.log("[useJoinCall] ✅ Started speaking");
      
      if (socketRef.current) {
        console.log("[useJoinCall] Emitting USER_SPEAKING_START");
        socketRef.current.emit("USER_SPEAKING_START", {
          type: "USER_SPEAKING_START",
          roomId,
        });
      }
    } catch (err: any) {
      console.error("[useJoinCall] ❌ startSpeaking error:", err);
      setError(err?.message ?? "Mic unavailable");
    }
  }, [pttReady, speaking, roomId]);

  const stopSpeaking = useCallback(() => {
    // Disable track (don't close producer)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    
    setSpeaking(false);
    console.log("[useJoinCall] Stopped speaking");
    
    if (socketRef.current) {
      socketRef.current.emit("USER_SPEAKING_STOP", {
        type: "USER_SPEAKING_STOP",
        roomId,
      });
    }
  }, [roomId]);

  return { 
    join, 
    leave,
    state, 
    error, 
    remoteStream, 
    audioLevel, 
    speaking, 
    startSpeaking, 
    stopSpeaking, 
    pttReady, 
    socket: socketRef.current, 
    callEnded 
  };
}
