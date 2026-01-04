import React, { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab } from "../../../components/ui/Fab";
import { AppButton } from "../../../components/ui/AppButton";
import { apiFetch } from "../../../state/api";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { endCall, startCall } from "../../../state/callActions";

// Consistent primary blue color
const PRIMARY_BLUE = "#5B9FFF";

type CallLog = {
  id: string;
  roomId: string;
  status: "active" | "ended";
  startTime: string;
  endTime?: string;
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

  const loadCallLogs = async () => {
    if (!token || role !== "host") return;
    setLoading(true);
    try {
      // Fetch call logs from API
      const res = await apiFetch<{ calls: CallLog[] }>("/host/calls", token);
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return "In progress";
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diff = Math.floor((end - start) / 1000); // seconds
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
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
              <AppButton
                label="End Call"
                variant="danger"
                onPress={() => dispatch(endCall())}
                fullWidth
              />
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
                    <View style={[styles.callIcon, { backgroundColor: item.status === "active" ? PRIMARY_BLUE + "20" : colors.background }]}>
                      <Ionicons
                        name={item.status === "active" ? "call" : "call-outline"}
                        size={20}
                        color={item.status === "active" ? PRIMARY_BLUE : colors.text}
                      />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[styles.logRoomId, { color: colors.text }]}>Room {item.roomId}</Text>
                      <Text style={[styles.logTime, { color: colors.text }]}>{formatDate(item.startTime)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === "active" ? "#22c55e" : "#64748b" }
                    ]}
                  >
                    {item.status === "active" && <View style={styles.statusDot} />}
                    <Text style={styles.statusText}>
                      {item.status === "active" ? "Active" : "Ended"}
                    </Text>
                  </View>
                </View>

                <View style={styles.logDetails}>
                  <View style={styles.logDetailItem}>
                    <Ionicons name="time-outline" size={16} color={colors.text} />
                    <Text style={[styles.logDetailText, { color: colors.text }]}>
                      {formatDuration(item.startTime, item.endTime)}
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
      <Fab icon="call" accessibilityLabel="Start call" onPress={() => dispatch(startCall())} />
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

