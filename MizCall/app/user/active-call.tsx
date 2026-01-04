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
  };

  const handlePressOut = () => {
    setIsPressing(false);
    stopSpeaking();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onLeave} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
          <View style={{ width: 24 }} />
        </View>

        {activeCall ? (
          <>
            {/* Call Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="people" size={20} color={PRIMARY_BLUE} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>Room ID</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{activeCall.roomId}</Text>
            </View>

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

            {/* Audio Level Meter (only show when connected and receiving audio) */}
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

            {/* Your Status Card (only show when connected) */}
            {state === "connected" && (
              <View style={[styles.yourStatusCard, { 
                backgroundColor: speaking ? SUCCESS_GREEN + "15" : colors.card,
                borderColor: speaking ? SUCCESS_GREEN : colors.border,
              }]}>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={speaking ? "mic" : "mic-off"} 
                    size={20} 
                    color={speaking ? SUCCESS_GREEN : "#64748b"} 
                  />
                  <Text style={[styles.yourStatusText, { color: speaking ? SUCCESS_GREEN : colors.text }]}>
                    {speaking ? "You are speaking..." : "You are muted"}
                  </Text>
                </View>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View style={[styles.errorCard, { backgroundColor: DANGER_RED + "15", borderColor: DANGER_RED }]}>
                <Ionicons name="alert-circle" size={20} color={DANGER_RED} />
                <Text style={[styles.errorText, { color: DANGER_RED }]}>{error}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={48} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Call</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Return to dashboard to wait for a call.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Controls */}
      {activeCall && (
        <View style={[styles.bottomControls, { 
          backgroundColor: colors.card, 
          borderTopColor: colors.border,
        }]}>
          {/* Push to Talk Button */}
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!pttReady || state !== "connected"}
            style={[
              styles.pttButton,
              {
                backgroundColor: isPressing ? SUCCESS_GREEN : PRIMARY_BLUE,
                opacity: !pttReady || state !== "connected" ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons 
              name={isPressing ? "mic" : "mic-off"} 
              size={32} 
              color="#fff" 
            />
            <Text style={styles.pttText}>
              {isPressing ? "Release to Mute" : "Hold to Talk"}
            </Text>
          </Pressable>

          {/* Leave Button */}
          <Pressable
            onPress={onLeave}
            style={[styles.leaveButton, { backgroundColor: DANGER_RED }]}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.leaveText}>Leave Call</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
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
    fontSize: 16,
    fontWeight: "600",
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
  yourStatusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  yourStatusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  errorCard: {
    padding: 16,
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
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
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
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    gap: 12,
  },
  pttButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },
  pttText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  leaveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});


