import React, { useEffect, useRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { useAppSelector } from "../../state/store";
import { useJoinCall } from "../../hooks/useJoinCall";

export default function UserActiveCallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const { join, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady } = useJoinCall();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!hasJoinedRef.current && activeCall?.routerRtpCapabilities) {
      hasJoinedRef.current = true;
      join();
    }
  }, [activeCall?.routerRtpCapabilities, join, activeCall]);

  const onLeave = () => {
    hasJoinedRef.current = false;
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>You can join, listen, and leave this call.</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activeCall ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Room: {activeCall.roomId}</Text>
            <Text style={[styles.status, { color: colors.text }]}>
              Status: {state === "connecting" ? "Connecting…" : state === "connected" ? "Connected" : "Idle"}
            </Text>
            <AppButton
              label={state === "connected" ? "Rejoin" : "Join call"}
              onPress={() => {
                hasJoinedRef.current = true;
                join();
              }}
              disabled={state === "connecting"}
              fullWidth
            />
            <AppButton label="Leave" variant="secondary" onPress={onLeave} fullWidth />
            <AppButton
              label={speaking ? "Release to mute" : "Hold to talk"}
              onPressIn={startSpeaking}
              onPressOut={stopSpeaking}
              onPress={() => {
                if (speaking) {
                  stopSpeaking();
                } else {
                  startSpeaking();
                }
              }}
              disabled={!pttReady || state !== "connected"}
              fullWidth
            />
            {error ? <Text style={[styles.error, { color: colors.text }]}>{error}</Text> : null}
            {remoteStream ? (
              <>
                <Text style={[styles.status, { color: colors.text }]}>Audio receiving…</Text>
                <View style={styles.meterRow}>
                  <View style={[styles.meterTrack, { borderColor: colors.border }]}>
                    <View
                      style={[
                        styles.meterFill,
                        {
                          backgroundColor: audioLevel > 0.05 ? "#22c55e" : "#f59e0b",
                          width: `${Math.min(100, Math.max(5, Math.round(audioLevel * 100)))}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.meterLabel, { color: colors.text }]}>
                    {Math.round(audioLevel * 100)}%
                  </Text>
                </View>
                {Platform.OS === "ios" || Platform.OS === "android" ? (
                  <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.hiddenRtc}
                    mirror={false}
                    objectFit="cover"
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No active call</Text>
            <Text style={[styles.status, { color: colors.text }]}>Return to dashboard to wait for a call.</Text>
            <AppButton label="Back" variant="secondary" onPress={onLeave} fullWidth />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.8,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  status: {
    opacity: 0.85,
  },
  error: {
    color: "#ef4444",
  },
  hiddenRtc: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  meterTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#11111111",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
  },
  meterLabel: {
    width: 48,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});


