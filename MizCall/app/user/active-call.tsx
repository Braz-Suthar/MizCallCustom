import React, { useEffect, useRef } from "react";
import { Dimensions, Platform, ScrollView, StyleSheet, Text, View, Pressable, ImageBackground } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../components/ui/AppButton";
import { LeaveCallModal } from "../../components/ui/LeaveCallModal";
import { useAppSelector } from "../../state/store";
import { useJoinCall } from "../../hooks/useJoinCall";
import { apiFetch, API_BASE } from "../../state/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SUCCESS_GREEN = "#22c55e";
const DANGER_RED = "#ef4444";

export default function UserActiveCallScreen() {
  const { colors } = useTheme();
  const primaryColor = colors.primary ?? "#3c82f6";
  const primaryTint = primaryColor.startsWith("#") ? `${primaryColor}15` : primaryColor;
  const router = useRouter();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const token = useAppSelector((s) => s.auth.token);
  const { join, leave, state, error, remoteStream, audioLevel, speaking, startSpeaking, stopSpeaking, pttReady, socket, callEnded } = useJoinCall();
  const hasJoinedRef = useRef(false);
  const [isPressing, setIsPressing] = React.useState(false);
  const [hostMuted, setHostMuted] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [callBackgroundUrl, setCallBackgroundUrl] = React.useState<string | null>(null);
  
  // Prevent back navigation during active call (unless explicitly leaving)
  usePreventRemove(!!activeCall && !isLeaving, ({ data }) => {
    // This will prevent all back navigation when activeCall exists and not leaving
  });

  // Handle call ended by host
  useEffect(() => {
    if (callEnded && !isLeaving) {
      console.log("[user-active-call] Call ended by host, navigating to dashboard");
      hasJoinedRef.current = false;
      leave();
      setIsLeaving(true);
      
      // Navigate back after a short delay to show the toast
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/user/(tabs)/dashboard");
        }
      }, 1000);
    }
  }, [callEnded, isLeaving, router, leave]);

  // Listen for host mic status updates
  useEffect(() => {
    if (!socket) return;

    socket.on("HOST_MIC_STATUS", (data) => {
      console.log("[user-active-call] HOST_MIC_STATUS:", data);
      setHostMuted(data.muted);
    });

    return () => {
      socket.off("HOST_MIC_STATUS");
    };
  }, [socket]);

  // Reset hasJoinedRef when activeCall ID changes (new call) or component unmounts/remounts
  useEffect(() => {
    hasJoinedRef.current = false;
    setIsLeaving(false);
    
    return () => {
      hasJoinedRef.current = false;
    };
  }, [activeCall?.roomId]);

  useEffect(() => {
    if (!hasJoinedRef.current && activeCall?.routerRtpCapabilities) {
      hasJoinedRef.current = true;
      join();
    }
  }, [activeCall?.routerRtpCapabilities, join, activeCall]);

  // Fetch host's call background (users see the same background as host)
  useEffect(() => {
    const loadBackground = async () => {
      if (!token) return;
      try {
        const res = await apiFetch<{ backgroundUrl: string | null }>(
          "/host/call-background",
          token
        );
        if (res.backgroundUrl) {
          setCallBackgroundUrl(res.backgroundUrl);
        }
      } catch (e) {
        console.warn("[user-active-call] Failed to load background:", e);
      }
    };
    loadBackground();
  }, [token]);

  const handleLeaveButtonClick = () => {
    setShowLeaveModal(true);
  };

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    hasJoinedRef.current = false;
    setIsLeaving(true);
    leave();
    
    // Small delay to allow usePreventRemove to update
    setTimeout(() => {
      router.back();
    }, 50);
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
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

  const contentView = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
      </View>

      {activeCall ? (
        <View style={styles.callContainer}>
          {/* Status Card */}
          <View style={[styles.statusCard, { 
            backgroundColor: state === "connected" ? SUCCESS_GREEN + "15" : primaryTint,
            borderColor: state === "connected" ? SUCCESS_GREEN : primaryColor,
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
                  borderColor: isPressing ? SUCCESS_GREEN : primaryColor,
                  opacity: !pttReady || state !== "connected" ? 0.4 : 1,
                },
              ]}
            >
              <Ionicons 
                name={isPressing ? "mic" : "mic-off"} 
                size={80} 
                color={isPressing ? "#fff" : primaryColor} 
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

          {/* Host Status Card */}
          {state === "connected" && (
            <View style={[styles.hostStatusCard, { 
              backgroundColor: hostMuted ? "#64748b15" : SUCCESS_GREEN + "15",
              borderColor: hostMuted ? "#64748b" : SUCCESS_GREEN,
            }]}>
              <View style={styles.statusRow}>
                <Ionicons 
                  name={hostMuted ? "mic-off" : "mic"} 
                  size={20} 
                  color={hostMuted ? "#64748b" : SUCCESS_GREEN} 
                />
                <Text style={[styles.hostStatusText, { color: hostMuted ? "#64748b" : SUCCESS_GREEN }]}>
                  Host is {hostMuted ? "muted" : "speaking"}
                </Text>
              </View>
            </View>
          )}

          {/* Audio Level Meter (Bottom Info) */}
          {remoteStream && state === "connected" && (
            <View style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.audioHeader}>
                <Ionicons name="volume-high" size={20} color={primaryColor} />
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
            onPress={handleLeaveButtonClick}
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

      {/* Leave Call Confirmation Modal */}
      <LeaveCallModal
        visible={showLeaveModal}
        onCancel={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        isHost={false}
      />
    </>
  );

  return (
    <View style={styles.container}>
      {callBackgroundUrl ? (
        <ImageBackground
          source={{ uri: `${API_BASE}${callBackgroundUrl}` }}
          style={styles.backgroundImage}
          blurRadius={2}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.backgroundOverlay}>
            {contentView}
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.backgroundFallback, { backgroundColor: colors.background }]}>
          {contentView}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundImageStyle: {
    opacity: 0.9,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  backgroundFallback: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
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
  hostStatusCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  hostStatusText: {
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


