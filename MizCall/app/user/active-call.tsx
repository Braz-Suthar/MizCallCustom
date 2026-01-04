import React, { useEffect, useRef } from "react";
import { Dimensions, Platform, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../components/ui/AppButton";
import { useAppSelector } from "../../state/store";
import { useJoinCall } from "../../hooks/useJoinCall";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRIMARY_BLUE = "#5B9FFF";
const SUCCESS_GREEN = "#22c55e";
const DANGER_RED = "#ef4444";

export default function UserActiveCallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const { join, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady } = useJoinCall();
  const hasJoinedRef = useRef(false);
  const [isPressing, setIsPressing] = React.useState(false);

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

  const handlePressIn = () => {
    setIsPressing(true);
    startSpeaking();
    
    // Notify backend that user started speaking
    // This will be implemented in useJoinCall hook
  };

  const handlePressOut = () => {
    setIsPressing(false);
    stopSpeaking();
    
    // Notify backend that user stopped speaking
    // This will be implemented in useJoinCall hook
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onLeave} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
        <View style={{ width: 24 }} />
      </View>

      {activeCall ? (
        <View style={styles.callContainer}>
          {/* Status Card */}
          <View style={[styles.statusCard, { 
            backgroundColor: state === "connected" ? SUCCESS_GREEN + "15" : PRIMARY_BLUE + "15",
            borderColor: state === "connected" ? SUCCESS_GREEN : PRIMARY_BLUE,
          }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { 
                backgroundColor: state === "connected" ? SUCCESS_GREEN : state === "connecting" ? "#FFA500" : "#64748b" 
              }]} />
              <Text style={[styles.statusText, { 
                color: state === "connected" ? SUCCESS_GREEN : state === "connecting" ? "#FFA500" : colors.text 
              }]}>
                {state === "connecting" ? "Connecting..." : state === "connected" ? "Connected" : "Idle"}
              </Text>
            </View>
          </View>

          {/* Big Circular PTT Button (Center) */}
          <View style={styles.pttContainer}>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!pttReady || state !== "connected"}
              style={[
                styles.pttCircle,
                {
                  backgroundColor: isPressing ? SUCCESS_GREEN : colors.card,
                  borderColor: isPressing ? SUCCESS_GREEN : PRIMARY_BLUE,
                  opacity: !pttReady || state !== "connected" ? 0.4 : 1,
                },
              ]}
            >
              <Ionicons 
                name={isPressing ? "mic" : "mic-off"} 
                size={80} 
                color={isPressing ? "#fff" : PRIMARY_BLUE} 
              />
            </Pressable>
            <Text style={[styles.pttInstructionText, { color: colors.text }]}>
              {isPressing ? "Release to Mute" : "Hold to Speak"}
            </Text>
            <Text style={[styles.pttStatusText, { 
              color: isPressing ? SUCCESS_GREEN : "#64748b" 
            }]}>
              {isPressing ? "🎤 Speaking..." : "🔇 Muted"}
            </Text>
          </View>

          {/* Audio Level Meter (Bottom Info) */}
          {remoteStream && state === "connected" && (
            <View style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.audioHeader}>
                <Ionicons name="volume-high" size={20} color={PRIMARY_BLUE} />
                <Text style={[styles.audioLabel, { color: colors.text }]}>Host Audio</Text>
              </View>
              <View style={styles.meterRow}>
                <View style={[styles.meterTrack, { borderColor: colors.border }]}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        backgroundColor: audioLevel > 0.05 ? SUCCESS_GREEN : "#64748b",
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
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={[styles.errorCard, { backgroundColor: DANGER_RED + "15", borderColor: DANGER_RED }]}>
              <Ionicons name="alert-circle" size={20} color={DANGER_RED} />
              <Text style={[styles.errorText, { color: DANGER_RED }]}>{error}</Text>
            </View>
          )}

          {/* Leave Button (Bottom) */}
          <Pressable
            onPress={onLeave}
            style={[styles.leaveButton, { backgroundColor: DANGER_RED }]}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.leaveText}>Leave Call</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="call-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Call</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Return to dashboard to wait for a call.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  callContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  statusCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignSelf: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  pttContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 40,
  },
  pttCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  pttInstructionText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  pttStatusText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  audioCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  audioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
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
  },
  meterTrack: {
    flex: 1,
    height: 8,
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
    fontSize: 13,
    fontWeight: "600",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginHorizontal: 20,
    marginBottom: Platform.OS === "ios" ? 34 : 20,
  },
  leaveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});


