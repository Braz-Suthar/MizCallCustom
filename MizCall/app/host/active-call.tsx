import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Platform, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { RTCView } from "react-native-webrtc";

import { AppButton } from "../../components/ui/AppButton";
import { useAppDispatch, useAppSelector } from "../../state/store";
import { endCall, startCall } from "../../state/callActions";
import { useHostCallMedia } from "../../hooks/useHostCallMedia";
import { apiFetch, API_BASE } from "../../state/api";

const PRIMARY_BLUE = "#5B9FFF";
const SUCCESS_GREEN = "#22c55e";
const DANGER_RED = "#ef4444";
const SCREEN_WIDTH = Dimensions.get("window").width;

type Participant = {
  id: string;
  username: string;
  userId: string;
  speaking: boolean;
  connected: boolean;
  lastSpoke?: number;
};

export default function ActiveCallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callStatus = useAppSelector((s) => s.call.status);
  const callError = useAppSelector((s) => s.call.error);
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);

  const { state: mediaState, error: mediaError, micEnabled, setMicEnabled, remoteStream } = useHostCallMedia({
    token,
    role,
    call: activeCall,
  });
  
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantStates, setParticipantStates] = useState<Record<string, { speaking: boolean; lastSpoke: number }>>({});
  const statusSocketRef = React.useRef<Socket | null>(null);

  // Fetch participants from backend
  const fetchParticipants = async () => {
    if (!activeCall?.roomId || !token) return;
    
    setLoadingParticipants(true);
    try {
      const response = await apiFetch<{ participants: Participant[] }>(
        `/host/calls/${activeCall.roomId}/participants`,
        token,
        { method: "GET" }
      );
      
      if (response.participants) {
        setParticipants(response.participants);
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Fetch participants when call is active
  useEffect(() => {
    if (!activeCall?.roomId) {
      setParticipants([]);
      return;
    }
    
    // Initial fetch
    fetchParticipants();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchParticipants, 5000);
    
    return () => clearInterval(interval);
  }, [activeCall?.roomId, token]);

  // Listen for real-time speaking status updates via Socket.IO
  useEffect(() => {
    if (!token || !activeCall?.roomId) return;

    console.log("[host-active-call] Setting up Socket.IO for speaking status...");

    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token }
    });

    statusSocketRef.current = socket;

    socket.on("connect", () => {
      console.log("[host-active-call] Socket.IO connected for speaking status");
      socket.emit("auth", { type: "auth", token });
    });

    socket.on("USER_SPEAKING_STATUS", (data) => {
      console.log("[host-active-call] USER_SPEAKING_STATUS:", data);
      
      setParticipantStates((prev) => ({
        ...prev,
        [data.userId]: {
          speaking: data.speaking,
          lastSpoke: data.speaking ? Date.now() : prev[data.userId]?.lastSpoke || Date.now(),
        },
      }));
    });

    socket.on("disconnect", (reason) => {
      console.log("[host-active-call] Socket.IO disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, activeCall?.roomId]);

  const participantData: Participant[] = useMemo(() => {
    const data = participants.map((p) => ({
      ...p,
      speaking: participantStates[p.id]?.speaking || false,
      lastSpoke: participantStates[p.id]?.lastSpoke || 0,
    }));

    // Sort: speaking users first, then by last spoke time
    return data.sort((a, b) => {
      if (a.speaking && !b.speaking) return -1;
      if (!a.speaking && b.speaking) return 1;
      return (b.lastSpoke || 0) - (a.lastSpoke || 0);
    });
  }, [participants, participantStates]);

  const onStart = async () => {
    try {
      await dispatch(startCall()).unwrap?.();
    } catch {
      // errors already surfaced via state
    }
  };

  const onEnd = () => {
    dispatch(endCall());
    router.back();
  };

  const toggleMute = () => {
    setMuted((m) => !m);
    setMicEnabled(!muted);
  };

  const hasCall = !!activeCall || callStatus === "starting";
  const speakingCount = participantData.filter((p) => p.speaking).length;
  const numColumns = SCREEN_WIDTH > 500 ? 3 : 2;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
      <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
          {hasCall && (
            <Text style={[styles.roomId, { color: colors.text }]}>
              Room: {activeCall?.roomId ?? "..."}
            </Text>
          )}
        </View>
        {hasCall && (
          <View style={[styles.statusBadge, { backgroundColor: SUCCESS_GREEN }]}>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        )}
      </View>

      {hasCall ? (
        <View style={styles.content}>
          {/* Call Info Bar */}
          <View style={[styles.infoBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={20} color={PRIMARY_BLUE} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {participantData.length} Participant{participantData.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="mic" size={20} color={SUCCESS_GREEN} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {speakingCount} Speaking
          </Text>
            </View>
          </View>

          {/* Error Messages */}
          {(callError || mediaError) && (
            <View style={[styles.errorBanner, { backgroundColor: DANGER_RED + "20", borderColor: DANGER_RED }]}>
              <Ionicons name="alert-circle" size={20} color={DANGER_RED} />
              <Text style={styles.errorText}>{callError || mediaError}</Text>
            </View>
          )}

          {/* Participants Grid */}
          <View style={styles.participantsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Participants
          </Text>
            
            {loadingParticipants && participantData.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={PRIMARY_BLUE} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Loading participants...</Text>
              </View>
            ) : participantData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Waiting for users to join...</Text>
              </View>
            ) : (
              <FlatList
                data={participantData}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                key={numColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContainer}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.participantCard,
                      {
                        width: (SCREEN_WIDTH - 60 - (numColumns - 1) * 12) / numColumns,
                        backgroundColor: colors.card,
                        borderColor: item.speaking ? SUCCESS_GREEN : colors.border,
                        borderWidth: item.speaking ? 3 : 1,
                      },
                    ]}
                  >
                    {/* Speaking Indicator */}
                    {item.speaking && (
                      <View style={[styles.speakingIndicator, { backgroundColor: SUCCESS_GREEN }]}>
                        <Ionicons name="mic" size={12} color="#fff" />
                      </View>
                    )}

                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: item.speaking
                            ? SUCCESS_GREEN
                            : getAvatarColor(item.username),
                        },
                      ]}
                    >
                      <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
                    </View>

                    {/* User Info */}
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text style={[styles.userId, { color: colors.text }]} numberOfLines={1}>
                      ID: {item.userId}
                    </Text>

                    {/* Status */}
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.speaking ? SUCCESS_GREEN : "#64748b" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          { color: item.speaking ? SUCCESS_GREEN : colors.text },
                        ]}
                      >
                      {item.speaking ? "Speaking" : "Idle"}
                    </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noCallContainer}>
          <View style={[styles.noCallCard, { backgroundColor: colors.card }]}>
            <Ionicons name="call-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.noCallTitle, { color: colors.text }]}>No Active Call</Text>
            <Text style={[styles.noCallText, { color: colors.text }]}>
              Start a call to see participants here
            </Text>
            <AppButton label="Start Call" onPress={onStart} fullWidth />
          </View>
        </View>
      )}

      {/* Hidden RTCView to play user audio */}
      {remoteStream && (Platform.OS === "ios" || Platform.OS === "android") && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.hiddenRtc}
          mirror={false}
          objectFit="cover"
        />
      )}

      {/* Control Bar (Fixed Bottom) */}
      {hasCall && (
        <View style={[styles.controlBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable
            style={[
              styles.controlButton,
              styles.muteButton,
              { backgroundColor: muted ? DANGER_RED : colors.background, borderColor: colors.border },
            ]}
            onPress={toggleMute}
            disabled={mediaState === "connecting"}
          >
            <Ionicons
              name={muted ? "mic-off" : "mic"}
              size={24}
              color={muted ? "#fff" : colors.text}
            />
            <Text style={[styles.controlButtonText, { color: muted ? "#fff" : colors.text }]}>
              {muted ? "Unmute" : "Mute"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.controlButton, styles.endCallButton, { backgroundColor: DANGER_RED }]}
            onPress={onEnd}
            disabled={callStatus === "starting"}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.endCallButtonText}>End Call</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  roomId: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e5e7eb",
    opacity: 0.5,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: DANGER_RED,
    fontSize: 13,
  },
  participantsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  gridContainer: {
    gap: 12,
    paddingBottom: 100,
  },
  participantCard: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  speakingIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  userId: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
  },
  noCallContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  noCallCard: {
    width: "100%",
    maxWidth: 400,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
  },
  noCallTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  noCallText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 8,
  },
  controlBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  controlButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  muteButton: {},
  controlButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  endCallButton: {
    borderWidth: 0,
  },
  endCallButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  hiddenRtc: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});

