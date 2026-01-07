import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../../../components/ui/AppButton";
import { useAppSelector, useAppDispatch } from "../../../state/store";
import { setActiveCall } from "../../../state/callSlice";
import { apiFetch } from "../../../state/api";
import { socketManager } from "../../../services/socketManager";

const SUCCESS_GREEN = "#22c55e";

export default function UserDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const { token } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveCall = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log("[UserDashboard] Fetching active call...");
      const response = await apiFetch<{ call: any }>("/user/active-call", token);
      
      if (response.call) {
        console.log("[UserDashboard] Active call found:", response.call);
        dispatch(setActiveCall({
          roomId: response.call.room_id || response.call.id,
          routerRtpCapabilities: response.call.router_rtp_capabilities || {},
          hostProducerId: response.call.host_producer_id || null,
          startedAt: response.call.started_at,
        }));
      } else {
        console.log("[UserDashboard] No active call found");
      }
    } catch (error: any) {
      // If 404, it means no active call - that's OK
      if (error?.message?.includes("404") || error?.message?.includes("No active call")) {
        console.log("[UserDashboard] No active call (expected)");
      } else {
        console.error("[UserDashboard] Error fetching active call:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch active call when component mounts
    fetchActiveCall();
  }, [token]);

  // Listen for real-time call events
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    const handleCallStarted = (data: any) => {
      console.log("[UserDashboard] call-started event received:", data);
      dispatch(setActiveCall({
        roomId: data.roomId,
        routerRtpCapabilities: data.routerRtpCapabilities || {},
        hostProducerId: data.hostProducerId || null,
        startedAt: new Date().toISOString(),
      }));
    };

    const handleCallStopped = () => {
      console.log("[UserDashboard] call-stopped event received");
      // The call will be cleared by useJoinCall, but we can also clear here
      // This ensures dashboard shows "No Active Calls" immediately
    };

    socket.on("call-started", handleCallStarted);
    socket.on("CALL_STARTED", handleCallStarted);
    socket.on("call-stopped", handleCallStopped);
    socket.on("CALL_STOPPED", handleCallStopped);

    console.log("[UserDashboard] Listening for call events on socket:", socket.id);

    return () => {
      socket.off("call-started", handleCallStarted);
      socket.off("CALL_STARTED", handleCallStarted);
      socket.off("call-stopped", handleCallStopped);
      socket.off("CALL_STOPPED", handleCallStopped);
    };
  }, [dispatch]);

  const onRefresh = () => {
    fetchActiveCall(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>User Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Quick access to your recordings and activity.</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Checking for active calls...</Text>
          </View>
        ) : activeCall ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: SUCCESS_GREEN }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusDot, { backgroundColor: SUCCESS_GREEN }]} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Active Call</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Ionicons name="radio-outline" size={18} color={colors.text} />
                <Text style={[styles.cardSub, { color: colors.text }]}>
                  Room: {activeCall.roomId?.slice(0, 8)}...
                </Text>
              </View>
              {activeCall.startedAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color={colors.text} />
                  <Text style={[styles.cardSub, { color: colors.text }]}>
                    Started: {new Date(activeCall.startedAt).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          <AppButton
              label="Join Call"
            onPress={() => router.push("/user/active-call")}
            fullWidth
              variant="primary"
          />
        </View>
      ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Calls</Text>
            <Text style={[styles.empty, { color: colors.text }]}>
              When a call is started by your host, it will appear here.
            </Text>
          </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.7,
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardSub: {
    fontSize: 14,
    opacity: 0.8,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  empty: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
});

