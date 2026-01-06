import React, { useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab } from "../../../components/ui/Fab";
import { AppButton } from "../../../components/ui/AppButton";
import { ActiveCallModal } from "../../../components/ui/ActiveCallModal";
import { apiFetch } from "../../../state/api";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { endCall, startCall } from "../../../state/callActions";

// Consistent primary blue color
const PRIMARY_BLUE = "#5B9FFF";

type CallLog = {
  id: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
  participants?: string[];
  duration?: string;
};

export default function HostCalls() {
  const { colors } = useTheme();
  const router = useRouter();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callStatus = useAppSelector((s) => s.call.status);
  const callError = useAppSelector((s) => s.call.error);
  const participants = useAppSelector((s) => s.call.participants);
  const { token, role } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActiveCallModal, setShowActiveCallModal] = useState(false);
  const [activeCallRoomId, setActiveCallRoomId] = useState<string | undefined>();
  const [isStartingCall, setIsStartingCall] = useState(false);

  const loadCallLogs = async () => {
    if (!token || role !== "host") return;
    setLoading(true);
    try {
      // Fetch call logs from API
      const res = await apiFetch<{ calls: CallLog[] }>("/host/calls", token);
      console.log("[calls] Loaded", res.calls?.length || 0, "calls");
      
      // Debug: Log call data
      if (res.calls && res.calls.length > 0) {
        console.log("[calls] Sample call:", {
          id: res.calls[0].id,
          status: res.calls[0].status,
          started_at: res.calls[0].started_at,
          ended_at: res.calls[0].ended_at,
        });
      }
      
      setCallLogs(res.calls || []);
    } catch (e) {
      console.error("Failed to load call logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCallLogs();
    }, [token, role])
  );

  const formatDate = (dateString: string) => {
    // console.log("[calls] formatDate", dateString);
    if (!dateString) return "Unknown";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error("[calls] Error formatting date:", error);
      return "Invalid date";
    }
  };

  const formatDuration = (startTime: string, endTime?: string | null, status?: string) => {
    try {
      const start = new Date(startTime);
      
      // Validate start time
      if (isNaN(start.getTime())) {
        return "Unknown";
      }
      
      const startUTC = start.toISOString().slice(11, 19); // HH:MM:SS format
      
      // If status is not "ended" or no endTime, show start time only
      if (status !== "ended" || !endTime) {
        return `Started: ${startUTC} UTC`;
      }
      
      const end = new Date(endTime);
      
      // Validate end time
      if (isNaN(end.getTime())) {
        return `Started: ${startUTC} UTC`;
      }
      
      const endUTC = end.toISOString().slice(11, 19); // HH:MM:SS format
      
      // Calculate duration
      const diffMs = end.getTime() - start.getTime();
      
      // If negative or unreasonably large, just show times
      if (diffMs < 0 || diffMs > 86400000) {
        return `${startUTC} - ${endUTC} UTC`;
      }
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      // Format: "HH:MM:SS - HH:MM:SS (Xm Ys)"
      let durationStr = "";
      if (hours > 0) {
        durationStr = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        durationStr = `${minutes}m ${seconds}s`;
      } else {
        durationStr = `${seconds}s`;
      }
      
      return `${startUTC} - ${endUTC} (${durationStr})`;
    } catch (error) {
      console.error("[calls] Error formatting duration:", error);
      return "Unknown";
    }
  };

  const handleStartCall = async () => {
    // Prevent double-tap
    if (isStartingCall) return;
    
    // Check if there's already an active call in Redux state
    if (activeCall || callStatus === "starting") {
      setActiveCallRoomId(activeCall?.roomId);
      setShowActiveCallModal(true);
      return;
    }
    
    // Check if there's any active call in the call logs
    const activeCallInLogs = callLogs.find(call => call.status !== "ended");
    if (activeCallInLogs) {
      setActiveCallRoomId(activeCallInLogs.id);
      setShowActiveCallModal(true);
      return;
    }
    
    // Start new call and navigate to it
    setIsStartingCall(true);
    try {
      const result = await dispatch(startCall()) as any;
      let roomId;
      
      // Handle both unwrapped and regular results
      if (result && typeof result.unwrap === 'function') {
        roomId = await result.unwrap();
      } else if (typeof result === 'string') {
        roomId = result;
      }
      
      // Navigate to the active call screen
      if (roomId) {
        router.push(`/host/active-call?roomId=${roomId}`);
      }
    } catch (error) {
      console.error("[handleStartCall] Error starting call:", error);
      // Error will be shown via callError state
    } finally {
      setIsStartingCall(false);
    }
  };

  const handleJoinCallFromModal = () => {
    setShowActiveCallModal(false);
    if (activeCallRoomId) {
      handleJoinCall(activeCallRoomId);
    }
  };

  const handleCancelModal = () => {
    setShowActiveCallModal(false);
    setActiveCallRoomId(undefined);
  };

  const handleJoinCall = (roomId?: string) => {
    const callId = roomId || activeCall?.roomId;
    if (callId) {
      // Navigate to the active call screen
      router.push(`/host/active-call?roomId=${callId}`);
    }
  };

  const handleEndCall = async (roomId?: string) => {
    const callId = roomId || activeCall?.roomId;
    if (!callId) return;
    
    Alert.alert(
      "End Call",
      "Are you sure you want to end this call?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Call",
          style: "destructive",
          onPress: async () => {
            await dispatch(endCall(callId));
            // Reload call logs to reflect the change
            await loadCallLogs();
          }
        }
      ]
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Calls</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Track active and historical calls.</Text>

        {/* Active Call Section */}
        {activeCall || callStatus === "starting" ? (
          <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: PRIMARY_BLUE }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="call" size={20} color={PRIMARY_BLUE} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Active Call</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: "#22c55e" }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            <Text style={[styles.roomId, { color: colors.text }]}>
              Room: {activeCall?.roomId ?? "starting..."}
            </Text>
            {callError ? <Text style={styles.error}>{callError}</Text> : null}
            <View style={styles.participants}>
              <Text style={[styles.participantsTitle, { color: colors.text }]}>Participants ({participants.length})</Text>
              {participants.length === 0 ? (
                <Text style={[styles.empty, { color: colors.text }]}>Waiting for users…</Text>
              ) : (
                participants.map((p) => (
                  <View key={p} style={[styles.participantRow, { backgroundColor: colors.background }]}>
                    <Ionicons name="person" size={16} color={colors.text} />
                    <Text style={[styles.participant, { color: colors.text }]}>{p}</Text>
                  </View>
                ))
              )}
            </View>
            <View style={styles.actions}>
              <View style={styles.actionRow}>
                <AppButton
                  label="Join Call"
                  variant="primary"
                  onPress={() => handleJoinCall()}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="End Call"
                  variant="danger"
                  onPress={() => handleEndCall()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Call Logs List */}
        <View style={styles.logsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Call History</Text>
          
          <FlatList
            data={callLogs}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadCallLogs}
                tintColor={PRIMARY_BLUE}
                colors={[PRIMARY_BLUE]}
              />
            }
            renderItem={({ item }) => (
              <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <View style={[styles.callIcon, { backgroundColor: item.status !== "ended" ? PRIMARY_BLUE + "20" : colors.background }]}>
                      <Ionicons
                        name={item.status !== "ended" ? "call" : "call-outline"}
                        size={20}
                        color={item.status !== "ended" ? PRIMARY_BLUE : colors.text}
                      />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logRoomId, { color: colors.text }]}>Room {item.id.slice(0, 8)}</Text>
                      <Text style={[styles.logTime, { color: colors.text }]}>{formatDate(item.started_at)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: item.status !== "ended" ? "#22c55e" : "#64748b" }
                    ]}
                  >
                    {item.status !== "ended" && <View style={styles.statusDot} />}
                    <Text style={styles.statusText}>
                      {item.status !== "ended" ? "Active" : "Ended"}
                    </Text>
                  </View>
                </View>

                <View style={styles.logDetails}>
                  <View style={styles.logDetailItem}>
                    <Ionicons name="time-outline" size={16} color={colors.text} />
                    <Text style={[styles.logDetailText, { color: colors.text }]}>
                      {formatDuration(item.started_at, item.ended_at, item.status)}
                    </Text>
                  </View>
                  {item.participants && item.participants.length > 0 && (
                    <View style={styles.logDetailItem}>
                      <Ionicons name="people-outline" size={16} color={colors.text} />
                      <Text style={[styles.logDetailText, { color: colors.text }]}>
                        {item.participants.length} participant{item.participants.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action buttons for active calls in history */}
                {item.status !== "ended" && (
                  <View style={styles.logActions}>
                    <AppButton
                      label="Join Call"
                      variant="primary"
                      onPress={() => handleJoinCall(item.id)}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <AppButton
                      label="End Call"
                      variant="danger"
                      onPress={() => handleEndCall(item.id)}
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.emptyList, { color: colors.text }]}>No call history yet</Text>
              ) : null
            }
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 80, gap: 12 }}
          />
        </View>
      </View>

      {/* Active Call Modal */}
      <ActiveCallModal
        visible={showActiveCallModal}
        title="Active Call Exists"
        message="You already have an active call. Do you want to join it?"
        onCancel={handleCancelModal}
        onConfirm={handleJoinCallFromModal}
        confirmText="Join Call"
        cancelText="Cancel"
      />

      <Fab 
        icon="call" 
        accessibilityLabel="Start call" 
        onPress={handleStartCall}
        loading={isStartingCall}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
  },
  activeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
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
  roomId: {
    fontSize: 14,
    opacity: 0.8,
  },
  error: {
    color: "#ef4444",
    fontSize: 13,
  },
  participants: {
    gap: 8,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  participant: {
    fontSize: 14,
  },
  actions: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  logsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  logCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logInfo: {
    flex: 1,
    gap: 4,
  },
  logRoomId: {
    fontSize: 15,
    fontWeight: "600",
  },
  logTime: {
    fontSize: 13,
    opacity: 0.7,
  },
  logDetails: {
    flexDirection: "row",
    gap: 16,
  },
  logDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logDetailText: {
    fontSize: 13,
    opacity: 0.8,
  },
  logActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  empty: {
    fontSize: 13,
    opacity: 0.7,
  },
  emptyList: {
    textAlign: "center",
    marginTop: 20,
    opacity: 0.7,
  },
});

