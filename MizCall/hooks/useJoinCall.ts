import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
type RtpCapabilities = any;
import { MediaStream, mediaDevices } from "react-native-webrtc";

import { useAppSelector } from "../state/store";
import { disableSpeakerphone, enableSpeakerphone, isMobilePlatform, startCallAudio, stopCallAudio } from "../utils/callAudio";

const WS_URL = "wss://custom.mizcall.com/ws";

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

  const wsRef = useRef<WebSocket | null>(null);
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
    wsRef.current?.close();
    wsRef.current = null;
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
    if (!producerId || !deviceRef.current || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({
        type: "CONSUME",
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
        roomId,
      }),
    );
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

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("[useJoinCall] ws open");
      try {
        startCallAudio();
        enableSpeakerphone();
      } catch {
        // best effort
      }
      ws.send(JSON.stringify({ type: "auth", token }));
      ws.send(JSON.stringify({ type: "JOIN", token, roomId }));
    };

    ws.onerror = (e) => {
      console.warn("[useJoinCall] ws error", e);
      setError("WebSocket error");
      setState("error");
    };

    ws.onclose = (ev) => {
      console.log("[useJoinCall] ws close", ev.code, ev.reason);
      wsRef.current = null;
      if (state !== "connected") {
        setState("idle");
      }
    };

    ws.onmessage = async (event) => {
      console.log("[useJoinCall] ws message", event.data);
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "SEND_TRANSPORT_CREATED") {
          const device = new Device({ handlerName: "ReactNative106" as any });
          await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
          deviceRef.current = device;
          const transport = device.createSendTransport(msg.params);
          sendTransportRef.current = transport;
          transport.on("connect", ({ dtlsParameters }, callback, errback) => {
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
              errback?.(err as Error);
            }
          });
          transport.on("produce", ({ rtpParameters }, callback, errback) => {
            try {
              ws.send(
                JSON.stringify({
                  type: "PRODUCE",
                  rtpParameters,
                  roomId,
                }),
              );
              callback({ id: String(Date.now()) });
            } catch (err) {
              errback?.(err as Error);
            }
          });
          setPttReady(true);
        }

        if (msg.type === "RECV_TRANSPORT_CREATED") {
          const device = deviceRef.current || new Device({ handlerName: "ReactNative106" as any });
          if (!device.loaded) {
            await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
          }
          deviceRef.current = device;

          const transport = device.createRecvTransport(msg.params);
          recvTransportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            ws.send(
              JSON.stringify({
                type: "CONNECT_RECV_TRANSPORT",
                dtlsParameters,
                roomId,
              }),
            );
            callback();
          });

          transport.on("connectionstatechange", (state) => {
            console.log("[useJoinCall] recv transport state", state);
          });

          // if we already know a producer, consume it
          if (producerIdRef.current) {
            ws.send(
              JSON.stringify({
                type: "CONSUME",
                producerId: producerIdRef.current,
                rtpCapabilities: device.rtpCapabilities,
                roomId,
              }),
            );
          }
          // also consume if hostProducerId already stored in state
          if (!producerIdRef.current && activeCall?.hostProducerId) {
            producerIdRef.current = activeCall.hostProducerId;
            ws.send(
              JSON.stringify({
                type: "CONSUME",
                producerId: activeCall.hostProducerId,
                rtpCapabilities: device.rtpCapabilities,
                roomId,
              }),
            );
          }
        }

        if (msg.type === "NEW_PRODUCER") {
          producerIdRef.current = msg.producerId;
          sendConsume(msg.producerId);
        }

        if (msg.type === "HOST_PRODUCER") {
          producerIdRef.current = msg.producerId;
          sendConsume(msg.producerId);
        }

        if (msg.type === "CONSUMER_CREATED") {
          if (!recvTransportRef.current || !deviceRef.current) return;
          try {
            const consumer = await recvTransportRef.current.consume({
              id: msg.params.id,
              producerId: msg.params.producerId,
              // Backend currently omits kind; default to audio to avoid failing consume
              kind: msg.params.kind ?? "audio",
              rtpParameters: msg.params.rtpParameters,
            });
            consumerRef.current = consumer;
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
            setState("connected");
          } catch (err: any) {
            console.warn("[useJoinCall] consume error", err);
            setError(err?.message ?? "Failed to consume audio");
            setState("error");
          }
        }
      } catch {
        // ignore parse errors
      }
    };
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
    } catch (err: any) {
      console.warn("[useJoinCall] startSpeaking error", err);
      setError(err?.message ?? "Mic unavailable");
    }
  }, [pttReady, speaking]);

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
  }, []);

  return { join, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady };
}

