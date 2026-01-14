import { useState, useCallback, useEffect } from "react";
import type { AudioDeviceInfo } from "../types";

export const useAudioDevices = () => {
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo>({
    input: [],
    output: [],
  });
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>("default");
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>("default");
  const [hardwareMuted, setHardwareMuted] = useState(false);

  // Enumerate audio devices
  const enumerateAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter((d) => d.kind === "audioinput");
      const outputDevices = devices.filter((d) => d.kind === "audiooutput");

      setAudioDevices({
        input: inputDevices,
        output: outputDevices,
      });

      console.log("[AudioDevices] Enumerated:", {
        inputs: inputDevices.length,
        outputs: outputDevices.length,
      });
    } catch (error) {
      console.error("[AudioDevices] Enumeration failed:", error);
    }
  }, []);

  // Monitor hardware mute from microphone track
  const monitorHardwareMute = useCallback((stream: MediaStream | null) => {
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const checkMuteState = () => {
      const isMuted = audioTrack.muted;
      setHardwareMuted(isMuted);

      if (isMuted) {
        console.log("[AudioDevices] Hardware mute detected");
      }
    };

    audioTrack.onmute = () => {
      console.log("[AudioDevices] Track muted event (hardware)");
      setHardwareMuted(true);
    };

    audioTrack.onunmute = () => {
      console.log("[AudioDevices] Track unmuted event (hardware)");
      setHardwareMuted(false);
    };

    // Initial check
    checkMuteState();
  }, []);

  // Switch input device (microphone)
  const switchInputDevice = useCallback(
    async (deviceId: string, localStreamRef: React.MutableRefObject<MediaStream | null>, producerRef: React.MutableRefObject<any>) => {
      try {
        console.log("[AudioDevices] Switching input device to:", deviceId);

        // Stop current stream if exists
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Get new stream with selected device
        const constraints: MediaStreamConstraints = {
          audio: deviceId === "default" ? true : { deviceId: { exact: deviceId } },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = newStream;

        // Monitor hardware mute on new track
        monitorHardwareMute(newStream);

        // If we have an active producer, replace the track
        if (producerRef.current && !producerRef.current.closed) {
          const newTrack = newStream.getAudioTracks()[0];
          await producerRef.current.replaceTrack({ track: newTrack });
          console.log("[AudioDevices] Producer track replaced");
        }

        setSelectedInputDevice(deviceId);
        return { success: true, message: "Microphone switched successfully" };
      } catch (error) {
        console.error("[AudioDevices] Failed to switch input device:", error);
        return { success: false, message: "Failed to switch microphone" };
      }
    },
    [monitorHardwareMute]
  );

  // Switch output device (speaker/headphones)
  const switchOutputDevice = useCallback(async (deviceId: string, remoteAudioElRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    try {
      console.log("[AudioDevices] Switching output device to:", deviceId);

      if (remoteAudioElRef.current && "setSinkId" in remoteAudioElRef.current) {
        await (remoteAudioElRef.current as any).setSinkId(deviceId === "default" ? "" : deviceId);
        setSelectedOutputDevice(deviceId);
        console.log("[AudioDevices] Output device switched");
        return { success: true, message: "Speaker switched successfully" };
      }
      return { success: false, message: "setSinkId not supported" };
    } catch (error) {
      console.error("[AudioDevices] Failed to switch output device:", error);
      return { success: false, message: "Failed to switch speaker" };
    }
  }, []);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    enumerateAudioDevices();

    const handleDeviceChange = () => {
      console.log("[AudioDevices] Device change detected");
      enumerateAudioDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateAudioDevices]);

  return {
    audioDevices,
    selectedInputDevice,
    selectedOutputDevice,
    hardwareMuted,
    enumerateAudioDevices,
    switchInputDevice,
    switchOutputDevice,
    monitorHardwareMute,
    setSelectedInputDevice,
    setSelectedOutputDevice,
  };
};
