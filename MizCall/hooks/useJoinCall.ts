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
        console.log("[useJoinCall] Closing consumer:", consumerRef.current.id);
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
    hostProducerIdRef.current = null;
    routerCapsRef.current = null;
    
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

  const leave = useCallback(() => {
    console.log("[useJoinCall] leave() called");
    cleanup();
    setState("idle");
    setError(null);
    setPttReady(false);
    setSpeaking(false);
  }, []);

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
      console.error("[useJoinCall] Cannot join: missing or empty router capabilities");
      setError("Waiting for call info - please wait for host to start");
      setState("idle");
      return;
    }

    console.log("[useJoinCall] Joining call", { roomId, hasRouterCaps: !!activeCall.routerRtpCapabilities });

    setState("connecting");
    setError(null);
    setRemoteStream(null);

    const socket = socketManager.getSocket();
    
    if (!socket) {
      console.error("[useJoinCall] No socket available from socketManager");
      setError("Connection not available");
      setState("error");
      return;
    }

    socketRef.current = socket;
    routerCapsRef.current = activeCall.routerRtpCapabilities || null;
    hostProducerIdRef.current = activeCall.hostProducerId || null;

    if (socket.connected) {
      console.log("[useJoinCall] Socket already connected:", socket.id);
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {}
      socket.emit("JOIN", { type: "JOIN", token, roomId });
      socket.emit("REQUEST_HOST_PRODUCER", { roomId });
    }

    const handleConnect = () => {
      console.log("[useJoinCall] Socket.IO connected:", socket.id);
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {}
      socket.emit("JOIN", { type: "JOIN", token, roomId });
      socket.emit("REQUEST_HOST_PRODUCER", { roomId });
    };

    const handleDisconnect = (reason: string) => {
      console.log("[useJoinCall] Socket.IO disconnected:", reason);
    };

    const handleConnectError = (error: Error) => {
      console.log("[useJoinCall] Connection error:", error.message);
      setError("Connection error");
      setState("error");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    const handleMsg = async (msgRaw: any) => {
      try {
        const msg = msgRaw || {};
        console.log("[useJoinCall] message", msg.type);

        if (msg.type === "ROUTER_CAPS") {
          routerCapsRef.current = msg.routerRtpCapabilities;
          console.log("[useJoinCall] Router caps received");
          if (msg.hostProducerId) {
            hostProducerIdRef.current = msg.hostProducerId;
          }
        }

        if (msg.type === "SEND_TRANSPORT_CREATED") {
          if (sendTransportRef.current) {
            console.log("[useJoinCall] Send transport already exists, skipping");
            return;
          }

          const device = new Device({ handlerName: "ReactNative106" as any });
          
          if (!routerCapsRef.current) {
            console.error("[useJoinCall] Missing router caps for send device load");
            return;
          }
          
          await device.load({ routerRtpCapabilities: routerCapsRef.current as RtpCapabilities });
          deviceRef.current = device;
          
          const transport = device.createSendTransport(msg.params);
          sendTransportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            socket.emit("CONNECT_SEND_TRANSPORT", { dtlsParameters, roomId });
            callback();
          });

          transport.on("produce", ({ rtpParameters }, callback) => {
            socket.emit("PRODUCE", { rtpParameters, roomId });
            callback({ id: String(Date.now()) });
          });

          setPttReady(true);
        }

        if (msg.type === "RECV_TRANSPORT_CREATED") {
          if (recvTransportRef.current) {
            console.log("[useJoinCall] Recv transport already exists, skipping");
            return;
          }

          const device = deviceRef.current || new Device({ handlerName: "ReactNative106" as any });
          
          if (!device.loaded) {
            if (!routerCapsRef.current) {
              console.error("[useJoinCall] Missing router caps for recv device load");
              return;
            }
            await device.load({ routerRtpCapabilities: routerCapsRef.current as RtpCapabilities });
            deviceRef.current = device;
          }

          const transport = device.createRecvTransport(msg.params);
          recvTransportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            console.log("[useJoinCall] recv transport connecting...");
            socket.emit("CONNECT_RECV_TRANSPORT", { dtlsParameters, roomId });
            callback();
          });

          transport.on("connectionstatechange", (state) => {
            console.log("[useJoinCall] recv transport state:", state);
          });

          // If we have host producer ID, consume it
          if (hostProducerIdRef.current) {
            console.log("[useJoinCall] Consuming host producer:", hostProducerIdRef.current);
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: hostProducerIdRef.current,
              rtpCapabilities: device.rtpCapabilities,
              roomId,
            });
          } else if (activeCall?.hostProducerId) {
            console.log("[useJoinCall] Consuming host producer from state:", activeCall.hostProducerId);
            hostProducerIdRef.current = activeCall.hostProducerId;
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: activeCall.hostProducerId,
              rtpCapabilities: device.rtpCapabilities,
              roomId,
            });
          } else {
            // No host producer yet, request it
            console.log("[useJoinCall] No host producer ID, requesting it");
            socket.emit("REQUEST_HOST_PRODUCER", { roomId });
          }
        }

        if (msg.type === "NEW_PRODUCER" && msg.ownerRole === "host") {
          console.log("[useJoinCall] NEW_PRODUCER from host:", msg.producerId);
          hostProducerIdRef.current = msg.producerId;
          
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }
          
          if (recvTransportRef.current && deviceRef.current) {
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: msg.producerId,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
              roomId,
            });
          }
        }

        if (msg.type === "HOST_PRODUCER") {
          console.log("[useJoinCall] HOST_PRODUCER received:", msg.producerId);
          hostProducerIdRef.current = msg.producerId;
          
          if (msg.routerRtpCapabilities) {
            routerCapsRef.current = msg.routerRtpCapabilities;
          }
          
          if (recvTransportRef.current && deviceRef.current) {
            socket.emit("CONSUME", {
              type: "CONSUME",
              producerId: msg.producerId,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
              roomId,
            });
          }
        }

        if (msg.type === "CONSUMER_CREATED" || msg.type === "CONSUMED") {
          const params = msg.params || msg;
          console.log("[useJoinCall] CONSUMED event received:", {
            consumerId: params.id,
            producerId: params.producerId,
            hasRecvTransport: !!recvTransportRef.current,
            currentConsumer: consumerRef.current?.id
          });
          
          // Skip if we already have a consumer for this ID (duplicate event)
          if (consumerRef.current && consumerRef.current.id === params.id) {
            console.log("[useJoinCall] Skipping duplicate CONSUMED event for consumer:", params.id);
            return;
          }
          
          if (!recvTransportRef.current) {
            console.warn("[useJoinCall] No recv transport, cannot create consumer");
            return;
          }
          
          try {
            // Close old consumer if exists
            if (consumerRef.current) {
              console.log("[useJoinCall] Closing previous consumer:", consumerRef.current.id);
              try {
                consumerRef.current.close?.();
              } catch (e) {
                console.warn("[useJoinCall] Error closing old consumer:", e);
              }
              consumerRef.current = null;
            }
            
            console.log("[useJoinCall] Creating new consumer:", params.id);
            const consumer = await recvTransportRef.current.consume({
              id: params.id,
              producerId: params.producerId,
              kind: params.kind ?? "audio",
              rtpParameters: params.rtpParameters,
            });
            
            consumerRef.current = consumer;
            console.log("[useJoinCall] Consumer created successfully, resuming...");
            await consumer.resume?.();
            consumer.track.enabled = true;
            
            const stream = new MediaStream([consumer.track]);
            setRemoteStream(stream);
            
            console.log("[useJoinCall] Host audio consumed", {
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
              console.warn("[useJoinCall] Error enabling audio:", e);
            }
            
            // Start audio level meter if not already running
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
                } catch (e) {
                  // ignore meter errors
                }
              }, 700);
            }
            
            setState("connected");
            console.log("[useJoinCall] ✅ Consumer setup complete, state set to connected");
          } catch (e: any) {
            // Ignore SessionDescription NULL errors (transient)
            if (e?.message?.includes("SessionDescription is NULL")) {
              console.log("[useJoinCall] Ignoring SessionDescription NULL error (transient)");
              return;
            }
            
            console.error("[useJoinCall] Error creating consumer:", e);
            setError(e?.message ?? "Failed to consume audio");
            setState("error");
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

    socket.on("message", handleMsg);
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
      socket.on(event, (payload) => handleMsg(payload ?? { type: event }));
    });

    return () => {
      console.log("[useJoinCall] Removing event listeners from socket");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("message");
      socket.off("ROUTER_CAPS");
      socket.off("SEND_TRANSPORT_CREATED");
      socket.off("RECV_TRANSPORT_CREATED");
      socket.off("NEW_PRODUCER");
      socket.off("HOST_PRODUCER");
      socket.off("CONSUMER_CREATED");
      socket.off("CONSUMED");
      socket.off("CALL_STOPPED");
      socket.off("call-stopped");
    };
  }, [token, role, activeCall?.routerRtpCapabilities, activeCall?.hostProducerId, dispatch, roomId, activeCall]);

  const startSpeaking = useCallback(async () => {
    if (!pttReady || !sendTransportRef.current || speaking) return;
    
    try {
      // Create producer if it doesn't exist
      if (!producerRef.current) {
        console.log("[useJoinCall] Creating producer for speaking");
        const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        const track = stream.getAudioTracks()[0];
        
        // Start with track enabled
        track.enabled = true;
        
        producerRef.current = await sendTransportRef.current.produce({ track });
        console.log("[useJoinCall] Producer created:", producerRef.current.id);
      } else {
        // Enable existing producer's track
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
        }
      }
      
      setSpeaking(true);
      console.log("[useJoinCall] Started speaking");
      
      if (socketRef.current) {
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
