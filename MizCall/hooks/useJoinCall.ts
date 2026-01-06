import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
type RtpCapabilities = any;
import { MediaStream, mediaDevices } from "react-native-webrtc";
import { io, Socket } from "socket.io-client";

import { useAppSelector } from "../state/store";
import { disableSpeakerphone, enableSpeakerphone, isMobilePlatform, startCallAudio, stopCallAudio } from "../utils/callAudio";

const SOCKET_URL = "https://custom.mizcall.com";

type JoinState = "idle" | "connecting" | "connected" | "error";

export function useJoinCall() {
  const { token, role } = useAppSelector((s) => s.auth);
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [pttReady, setPttReady] = useState(false);

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
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch {
      // ignore
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    recvTransportRef.current?.close?.();
    recvTransportRef.current = null;
    sendTransportRef.current?.close?.();
    sendTransportRef.current = null;
    try {
      producerRef.current?.close?.();
    } catch {
      // ignore
    }
    producerRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    deviceRef.current = null;
    consumerRef.current = null;
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    setAudioLevel(0);
    zeroLevelCountRef.current = 0;
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
    if (!activeCall?.routerRtpCapabilities) {
      setError("Waiting for call info");
      setState("idle");
      return;
    }

    setState("connecting");
    setError(null);
    setRemoteStream(null);

    console.log("[useJoinCall] Connecting to Socket.IO...");

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

    // Debug: Listen to all events
    socket.onAny((eventName, ...args) => {
      console.log(`[useJoinCall] Socket event: ${eventName}`, args);
    });

    socket.on("connect", async () => {
      console.log("[useJoinCall] Socket.IO connected:", socket.id);
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {
        // best effort
      }
      socket.emit("auth", { type: "auth", token });
      socket.emit("JOIN", { type: "JOIN", token, roomId });
    });

    socket.on("disconnect", (reason) => {
      console.log("[useJoinCall] Socket.IO disconnected:", reason);
      socketRef.current = null;
      if (state !== "connected") {
        setState("idle");
      }
    });

    socket.on("connect_error", (error) => {
      console.log("[useJoinCall] Connection error:", error.message);
      setError("Connection error");
      setState("error");
    });

    const handleMessage = async (msg: any) => {
      console.log("[useJoinCall] message:", msg.type);
      try {
        if (msg.type === "SEND_TRANSPORT_CREATED") {
          const device = new Device({ handlerName: "ReactNative106" as any });
          await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
          deviceRef.current = device;
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
          const device = deviceRef.current || new Device({ handlerName: "ReactNative106" as any });
          if (!device.loaded) {
            await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
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
          
          console.log("[useJoinCall] CONSUMER event received:", msg.type, "Consumer ID:", consumerId);
          
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
            const kind = msg.params?.kind || msg.kind || "audio";
            const rtpParameters = msg.params?.rtpParameters || msg.rtpParameters;
            
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
  }, [token, role, activeCall?.routerRtpCapabilities]);

  const startSpeaking = useCallback(async () => {
    if (!pttReady || !sendTransportRef.current || speaking) return;
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      producerRef.current = await sendTransportRef.current.produce({ track });
      setSpeaking(true);
      console.log("[useJoinCall] started speaking");
      
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
    try {
      producerRef.current?.close?.();
    } catch {
      // ignore
    }
    producerRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setSpeaking(false);
    console.log("[useJoinCall] stopped speaking");
    
    // Notify backend that user stopped speaking
    if (socketRef.current) {
      console.log("[useJoinCall] Emitting USER_SPEAKING_STOP");
      socketRef.current.emit("USER_SPEAKING_STOP", {
        type: "USER_SPEAKING_STOP",
        roomId,
      });
    }
  }, [roomId]);

  return { join, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady, socket: socketRef.current };
}

