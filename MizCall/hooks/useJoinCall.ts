import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
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

  const wsRef = useRef<WebSocket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<any>(null);
  const producerIdRef = useRef<string | null>(null);
  const consumerRef = useRef<any>(null);
  const meterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const zeroLevelCountRef = useRef(0);

  const cleanup = () => {
    try {
      stopCallAudio();
      disableSpeakerphone();
    } catch {
      // ignore
    }
    wsRef.current?.close();
    wsRef.current = null;
    transportRef.current?.close?.();
    transportRef.current = null;
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

  const join = useCallback(async () => {
    if (!token || role !== "user") {
      setError("Missing auth");
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
      ws.send(JSON.stringify({ type: "JOIN", token }));
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
        if (msg.type === "RECV_TRANSPORT_CREATED") {
          const device = new Device({ handlerName: "ReactNative106" as any });
          await device.load({ routerRtpCapabilities: (activeCall?.routerRtpCapabilities || {}) as RtpCapabilities });
          deviceRef.current = device;

          const transport = device.createRecvTransport(msg.params);
          transportRef.current = transport;

          transport.on("connect", ({ dtlsParameters }, callback) => {
            ws.send(
              JSON.stringify({
                type: "CONNECT_RECV_TRANSPORT",
                dtlsParameters,
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
              }),
            );
          }
        }

        if (msg.type === "NEW_PRODUCER") {
          producerIdRef.current = msg.producerId;
          ws.send(
            JSON.stringify({
              type: "CONSUME",
              producerId: msg.producerId,
              rtpCapabilities: deviceRef.current?.rtpCapabilities,
            }),
          );
        }

        if (msg.type === "CONSUMER_CREATED") {
          if (!transportRef.current || !deviceRef.current) return;
          try {
            const consumer = await transportRef.current.consume({
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
                await mediaDevices.setSpeakerphoneOn?.(true);
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
              audioTrack.onunmute = () => {
                console.log("[useJoinCall] audio track unmuted");
              };
              audioTrack.onmute = () => {
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

  return { join, state, error, remoteStream, audioLevel };
}

