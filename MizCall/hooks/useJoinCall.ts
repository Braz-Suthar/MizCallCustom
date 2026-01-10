import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
type RtpCapabilities = any;
import { MediaStream, mediaDevices } from "react-native-webrtc";
import { Socket } from "socket.io-client";
import Toast from "react-native-toast-message";

import { useAppSelector, useAppDispatch } from "../state/store";
import { clearActiveCall } from "../state/callSlice";
import { disableSpeakerphone, enableSpeakerphone, isMobilePlatform, startCallAudio, stopCallAudio } from "../utils/callAudio";
import { socketManager } from "../services/socketManager";

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
  const producerIdRef = useRef<string | null>(null);
  const producerRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zeroLevelCountRef = useRef(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    console.log("[useJoinCall] Starting cleanup...");
    
    // Stop call audio
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch (e) {
      console.warn("[useJoinCall] Error stopping call audio:", e);
    }
    
    // Close consumer first (before transport)
    try {
      if (consumerRef.current) {
        console.log("[useJoinCall] Closing consumer on cleanup");
        consumerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing consumer:", e);
    }
    consumerRef.current = null;
    
    // Close producer when leaving call
    try {
      if (producerRef.current) {
        console.log("[useJoinCall] Closing producer on cleanup");
        producerRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing producer:", e);
    }
    producerRef.current = null;
    producerIdRef.current = null;
    
    // Close transports
    try {
      if (recvTransportRef.current) {
        console.log("[useJoinCall] Closing recv transport");
        recvTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing recv transport:", e);
    }
    recvTransportRef.current = null;
    
    try {
      if (sendTransportRef.current) {
        console.log("[useJoinCall] Closing send transport");
        sendTransportRef.current.close?.();
      }
    } catch (e) {
      console.warn("[useJoinCall] Error closing send transport:", e);
    }
    sendTransportRef.current = null;
    
    // Stop all media tracks
    if (localStreamRef.current) {
      console.log("[useJoinCall] Stopping local media tracks");
      localStreamRef.current.getTracks().forEach((t) => {
        console.log("[useJoinCall] Stopping track:", t.id, t.label);
        t.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear device
    deviceRef.current = null;
    
    // Clear meter interval
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    
    // Clear remote stream
    setRemoteStream(null);
    setAudioLevel(0);
    zeroLevelCountRef.current = 0;
    
    // DON'T disconnect the socket - it's managed by socketManager
    // But clear the ref so we know we're not in a call
    socketRef.current = null;
    
    console.log("[useJoinCall] ✅ Cleanup complete");
  };

  useEffect(() => cleanup, []);

  const sendConsume = (producerId: string) => {
    if (!producerId || !deviceRef.current || !socketRef.current) return;
    
    console.log("[useJoinCall] Sending CONSUME request for producer:", producerId);
    socketRef.current.emit("CONSUME", {
      type: "CONSUME",
      producerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities,
      roomId,
    });
  };

  const join = useCallback(async () => {
    // Ensure a clean slate on every join attempt (helps when rejoining)
    try {
      consumerRef.current?.close?.();
    } catch {}
    consumerRef.current = null;
    try {
      producerRef.current?.close?.();
    } catch {}
    producerRef.current = null;
    producerIdRef.current = null;
    recvTransportRef.current?.close?.();
    recvTransportRef.current = null;
    sendTransportRef.current?.close?.();
    sendTransportRef.current = null;
    deviceRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks?.().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

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
      console.error("[useJoinCall] Cannot join: missing or empty router capabilities");
      console.log("[useJoinCall] activeCall:", activeCall);
      setError("Waiting for call info - please wait for host to start");
      setState("idle");
      return;
    }

    console.log("[useJoinCall] Joining call with valid router capabilities:", {
      roomId,
      hasRouterCaps: !!activeCall.routerRtpCapabilities,
      capsKeys: Object.keys(activeCall.routerRtpCapabilities),
      hostProducerId: activeCall.hostProducerId
    });

    setState("connecting");
    setError(null);
    setRemoteStream(null);

    console.log("[useJoinCall] Using global socket from socketManager");

    // Use the global socket from socketManager instead of creating a new one
    const socket = socketManager.getSocket();
    
    if (!socket) {
      console.error("[useJoinCall] No socket available from socketManager");
      setError("Connection not available");
      setState("error");
      return;
    }

    socketRef.current = socket;

    // Debug: Listen to all events
    socket.onAny((eventName, ...args) => {
      console.log(`[useJoinCall] Socket event: ${eventName}`, args);
    });

    // Check if already connected
    if (socket.connected) {
      console.log("[useJoinCall] Socket already connected:", socket.id);
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {
        // best effort
      }
      // Emit JOIN to join the call room
      socket.emit("JOIN", { type: "JOIN", token, roomId });
    } else {
      console.log("[useJoinCall] Socket not connected, waiting for connection...");
    }

    const handleConnect = () => {
      console.log("[useJoinCall] Socket.IO connected:", socket.id);
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {
        // best effort
      }
      socket.emit("JOIN", { type: "JOIN", token, roomId });
    };

    const handleDisconnect = (reason: string) => {
      console.log("[useJoinCall] Socket.IO disconnected:", reason);
      // Don't clear socketRef - it's managed globally
      if (state !== "connected") {
        setState("idle");
      }
    };

    const handleConnectError = (error: Error) => {
      console.log("[useJoinCall] Connection error:", error.message);
      setError("Connection error");
      setState("error");
    };

    // Add event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    const handleMessage = async (msg: any) => {
      console.log("[useJoinCall] message:", msg.type);
      try {
        if (msg.type === "SEND_TRANSPORT_CREATED") {
          console.log("[useJoinCall] SEND_TRANSPORT_CREATED - Loading device");
          
          // Validate router capabilities before loading device
          const routerCaps = activeCall?.routerRtpCapabilities;
          if (!routerCaps || Object.keys(routerCaps).length === 0) {
            console.error("[useJoinCall] Cannot load device: missing or empty router capabilities");
            setError("Missing router capabilities - please wait for call data");
            setState("error");
            return;
          }
          
          console.log("[useJoinCall] Router capabilities available, loading device");
          const device = new Device({ handlerName: "ReactNative106" as any });
          await device.load({ routerRtpCapabilities: routerCaps as RtpCapabilities });
          deviceRef.current = device;
          
          console.log("[useJoinCall] Device loaded successfully");
          
          const transport = device.createSendTransport(msg.params);
          sendTransportRef.current = transport;
          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit("CONNECT_SEND_TRANSPORT", {
                  type: "CONNECT_SEND_TRANSPORT",
                  dtlsParameters,
                  roomId,
              });
              callback();
            } catch (err) {
              errback?.(err as Error);
            }
          });
          transport.on("produce", ({ rtpParameters }, callback, errback) => {
            try {
              socket.emit("PRODUCE", {
                  type: "PRODUCE",
                  rtpParameters,
                  roomId,
              });
              callback({ id: String(Date.now()) });
            } catch (err) {
              errback?.(err as Error);
            }
          });
          setPttReady(true);
        }

        if (msg.type === "RECV_TRANSPORT_CREATED") {
          console.log("[useJoinCall] RECV_TRANSPORT_CREATED received");
          
          // Validate router capabilities
          const routerCaps = activeCall?.routerRtpCapabilities;
          if (!routerCaps || Object.keys(routerCaps).length === 0) {
            console.error("[useJoinCall] Cannot create recv transport: missing router capabilities");
            setError("Missing router capabilities");
            setState("error");
            return;
          }
          
          const device = deviceRef.current || new Device({ handlerName: "ReactNative106" as any });
          if (!device.loaded) {
            console.log("[useJoinCall] Loading device for recv transport");
            await device.load({ routerRtpCapabilities: routerCaps as RtpCapabilities });
            console.log("[useJoinCall] Device loaded successfully");
          }
          deviceRef.current = device;

          const transport = device.createRecvTransport(msg.params);
          recvTransportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            console.log("[useJoinCall] recv transport connecting...");
            socket.emit("CONNECT_RECV_TRANSPORT", {
              type: "CONNECT_RECV_TRANSPORT",
              dtlsParameters,
              roomId,
            });
            callback();
          });

          transport.on("connectionstatechange", (state) => {
            console.log("[useJoinCall] recv transport state:", state);
          });

          console.log("[useJoinCall] Recv transport created, sending CONSUME requests");
          
          // Immediately send consume requests (transport will connect during consume)
          if (producerIdRef.current) {
            console.log("[useJoinCall] Consuming pending producer:", producerIdRef.current);
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: producerIdRef.current,
              rtpCapabilities: device.rtpCapabilities,
              roomId,
            });
          } else if (activeCall?.hostProducerId) {
            console.log("[useJoinCall] Consuming host producer from state:", activeCall.hostProducerId);
            producerIdRef.current = activeCall.hostProducerId;
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: activeCall.hostProducerId,
              rtpCapabilities: device.rtpCapabilities,
              roomId,
            });
          }
        }

        if (msg.type === "NEW_PRODUCER") {
          console.log("[useJoinCall] NEW_PRODUCER received:", msg.producerId);
          producerIdRef.current = msg.producerId;
          sendConsume(msg.producerId);
        }

        if (msg.type === "HOST_PRODUCER") {
          console.log("[useJoinCall] HOST_PRODUCER received:", msg.producerId);
          producerIdRef.current = msg.producerId;
          sendConsume(msg.producerId);
        }

        if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
          // Handle both message formats (params object or root level)
          const consumerId = msg.params?.id || msg.id;
          const producerId = msg.params?.producerId || msg.producerId;
          const kind = msg.params?.kind || msg.kind || "audio";
          const rtpParameters = msg.params?.rtpParameters || msg.rtpParameters;
          
          console.log("[useJoinCall] CONSUMER event received:", msg.type, "Consumer ID:", consumerId);
          console.log("[useJoinCall] Full message:", JSON.stringify(msg, null, 2));
          
          // Validate required fields
          if (!consumerId) {
            console.error("[useJoinCall] Missing consumer ID in message:", msg);
            return;
          }
          if (!producerId) {
            console.error("[useJoinCall] Missing producer ID in message:", msg);
            return;
          }
          if (!rtpParameters) {
            console.error("[useJoinCall] Missing rtpParameters in message:", msg);
            return;
          }
          
          // Skip if we already have ANY consumer (prevent duplicate creation)
          if (consumerRef.current) {
            console.log("[useJoinCall] Consumer already exists (ID:", consumerRef.current.id, "), skipping event:", msg.type);
            return;
          }
          
          if (!recvTransportRef.current || !deviceRef.current) {
            console.warn("[useJoinCall] recvTransport or device not ready");
            return;
          }
          
          try {
            console.log("[useJoinCall] Creating consumer:", { consumerId, producerId, kind });
            
            const consumer = await recvTransportRef.current.consume({
              id: consumerId,
              producerId: producerId,
              kind: kind,
              rtpParameters: rtpParameters,
            });
            
            consumerRef.current = consumer;
            console.log("[useJoinCall] Consumer created successfully");
            console.log("[useJoinCall] Consumer created, resuming...");
            // Resume to ensure audio flows
            await consumer.resume?.();
            
            const stream = new MediaStream([consumer.track]);
            
            // Route to speaker on mobile for clarity
            try {
              if (isMobilePlatform) {
                // setSpeakerphoneOn available on react-native-webrtc; TS def may be missing
                await (mediaDevices as any).setSpeakerphoneOn?.(true);
              }
            } catch {
              // best effort; ignore if not supported
            }
            
            // Ensure track is enabled
            consumer.track.enabled = true;
            console.log("[useJoinCall] consumer track", {
              id: consumer?.id,
              kind: consumer?.kind,
              enabled: consumer?.track?.enabled,
              readyState: consumer?.track?.readyState,
              settings: consumer?.track?.getSettings?.(),
            });
            
            const audioTrack = stream.getAudioTracks?.()[0];
            console.log("[useJoinCall] remote stream tracks", {
              audioCount: stream.getAudioTracks?.().length,
              videoCount: stream.getVideoTracks?.().length,
              audioEnabled: audioTrack?.enabled,
              audioReadyState: audioTrack?.readyState,
              audioSettings: audioTrack?.getSettings?.(),
            });
            
            if (audioTrack) {
              audioTrack.enabled = true;
              (audioTrack as any).onunmute = () => {
                console.log("[useJoinCall] audio track unmuted");
              };
              (audioTrack as any).onmute = () => {
                console.log("[useJoinCall] audio track muted");
              };
            }
            
            setRemoteStream(stream);
            
            try {
              startCallAudio();
              enableSpeakerphone();
            } catch {
              // best effort
            }
            
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
                      // log once after a few zero samples to debug stats availability
                      console.log("[useJoinCall] inbound stats sample", Array.from(stats.values?.() ?? stats));
                    }
                  } else {
                    zeroLevelCountRef.current = 0;
                  }
                  setAudioLevel(level);
                } catch {
                  // ignore meter errors
                }
              }, 700);
            }
            
            console.log("[useJoinCall] Setting state to connected");
            setState("connected");
          } catch (err: any) {
            // Ignore SessionDescription NULL errors (transient, audio already working)
            if (err?.message?.includes("SessionDescription is NULL")) {
              console.log("[useJoinCall] Ignoring SessionDescription NULL error (audio already working)");
              return;
            }
            
            console.error("[useJoinCall] consume error:", err);
            setError(err?.message ?? "Failed to consume audio");
            setState("error");
          }
        }

        // Handle call stopped by host
        if (msg.type === "CALL_STOPPED" || msg.type === "call-stopped") {
          console.log("[useJoinCall] Call stopped by host");
          setCallEnded(true);
          
          // Show toast notification
          Toast.show({
            type: "info",
            text1: "Call Ended",
            text2: "The call has been ended by the host",
            position: "top",
            visibilityTime: 3000,
            topOffset: 48,
          });
          
          // Clear active call from Redux
          dispatch(clearActiveCall());
          
          // Cleanup will happen via useEffect when activeCall becomes null
        }
      } catch (e) {
        console.warn("[useJoinCall] message error:", e);
      }
    };

    // Listen for all message types
    socket.on("message", (msg) => {
      console.log("[useJoinCall] Received 'message' event:", msg.type);
      handleMessage(msg);
    });
    
    socket.on("SEND_TRANSPORT_CREATED", (msg) => {
      console.log("[useJoinCall] Received 'SEND_TRANSPORT_CREATED' event");
      handleMessage({ type: "SEND_TRANSPORT_CREATED", ...msg });
    });
    
    socket.on("RECV_TRANSPORT_CREATED", (msg) => {
      console.log("[useJoinCall] Received 'RECV_TRANSPORT_CREATED' event");
      handleMessage({ type: "RECV_TRANSPORT_CREATED", ...msg });
    });
    
    socket.on("NEW_PRODUCER", (msg) => {
      console.log("[useJoinCall] Received 'NEW_PRODUCER' event:", msg);
      handleMessage({ type: "NEW_PRODUCER", ...msg });
    });
    
    socket.on("HOST_PRODUCER", (msg) => {
      console.log("[useJoinCall] Received 'HOST_PRODUCER' event:", msg);
      handleMessage({ type: "HOST_PRODUCER", ...msg });
    });
    
    socket.on("CONSUMER_CREATED", (msg) => {
      console.log("[useJoinCall] Received 'CONSUMER_CREATED' event:", msg);
      handleMessage({ type: "CONSUMER_CREATED", ...msg });
    });
    
    socket.on("CONSUMED", (msg) => {
      console.log("[useJoinCall] Received 'CONSUMED' event:", msg);
      handleMessage({ type: "CONSUMED", ...msg });
    });
    
    socket.on("CALL_STOPPED", (msg) => {
      console.log("[useJoinCall] Received 'CALL_STOPPED' event:", msg);
      handleMessage({ type: "CALL_STOPPED", ...msg });
    });
    
    socket.on("call-stopped", (msg) => {
      console.log("[useJoinCall] Received 'call-stopped' event:", msg);
      handleMessage({ type: "call-stopped", ...msg });
    });

    // Cleanup function to remove event listeners
    return () => {
      console.log("[useJoinCall] Removing event listeners from socket");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("message", (msg) => handleMessage(msg));
      socket.off("SEND_TRANSPORT_CREATED");
      socket.off("RECV_TRANSPORT_CREATED");
      socket.off("NEW_PRODUCER");
      socket.off("HOST_PRODUCER");
      socket.off("CONSUMER_CREATED");
      socket.off("CONSUMED");
      socket.off("CALL_STOPPED");
      socket.off("call-stopped");
      socket.offAny();
    };
  }, [token, role, activeCall?.routerRtpCapabilities, dispatch, roomId, activeCall]);

  const startSpeaking = useCallback(async () => {
    if (!pttReady || !sendTransportRef.current || speaking) return;
    
    try {
      // If producer doesn't exist, create it once
      if (!producerRef.current) {
        console.log("[useJoinCall] Creating persistent producer (first time)");
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
        
        // Start with track disabled
        track.enabled = false;
        
        // Create producer once
      producerRef.current = await sendTransportRef.current.produce({ track });
        console.log("[useJoinCall] Persistent producer created:", producerRef.current.id);
      }
      
      // Enable the audio track to start sending audio
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      
      setSpeaking(true);
      console.log("[useJoinCall] started speaking (track enabled)");
      
      // Notify backend that user started speaking
      if (socketRef.current) {
        console.log("[useJoinCall] Emitting USER_SPEAKING_START");
        socketRef.current.emit("USER_SPEAKING_START", {
          type: "USER_SPEAKING_START",
          roomId,
        });
      }
    } catch (err: any) {
      console.warn("[useJoinCall] startSpeaking error", err);
      setError(err?.message ?? "Mic unavailable");
    }
  }, [pttReady, speaking, roomId]);

  const stopSpeaking = useCallback(() => {
    // Don't close producer, just disable the audio track
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    
    setSpeaking(false);
    console.log("[useJoinCall] stopped speaking (track disabled)");
    
    // Notify backend that user stopped speaking
    if (socketRef.current) {
      console.log("[useJoinCall] Emitting USER_SPEAKING_STOP");
      socketRef.current.emit("USER_SPEAKING_STOP", {
        type: "USER_SPEAKING_STOP",
        roomId,
      });
    }
  }, [roomId]);

  return { join, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady, socket: socketRef.current, callEnded };
}

