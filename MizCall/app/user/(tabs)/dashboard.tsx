import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../../../components/ui/AppButton";
import { useAppSelector, useAppDispatch } from "../../../state/store";
import { setActiveCall, clearActiveCall } from "../../../state/callSlice";
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
  const [socketReady, setSocketReady] = useState(false);

  const fetchActiveCall = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log("[UserDashboard] Fetching active call from API...");
      const response = await apiFetch<{ call: any }>("/user/active-call", token);
      
      if (response.call) {
        console.log("[UserDashboard] Active call found from API:", response.call);
        
        // Only set active call if we have the required fields
        if (response.call.router_rtp_capabilities && response.call.host_producer_id) {
          console.log("[UserDashboard] Setting active call with complete data from API");
          dispatch(setActiveCall({
            roomId: response.call.room_id || response.call.id,
            routerRtpCapabilities: response.call.router_rtp_capabilities,
            hostProducerId: response.call.host_producer_id,
            startedAt: response.call.started_at,
          }));
        } else {
          console.warn("[UserDashboard] Active call from API missing complete data - socket events will provide updates");
          // Don't set incomplete data - wait for socket event
        }
      } else {
        console.log("[UserDashboard] No active call found from API");
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

  // Fetch active call ONLY on mount and on pull-to-refresh
  useEffect(() => {
    console.log("[UserDashboard] Component mounted - fetching active call from API");
    fetchActiveCall();
  }, [token]);

  // Check for socket availability periodically
  useEffect(() => {
    const checkSocket = () => {
      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        console.log("[UserDashboard] ✅ Socket is ready:", socket.id);
        setSocketReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkSocket()) return;

    // If not ready, check every 100ms for up to 5 seconds
    console.log("[UserDashboard] Socket not ready, will check periodically...");
    const interval = setInterval(() => {
      if (checkSocket()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!socketReady) {
        console.error("[UserDashboard] Socket not available after 5 seconds");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Listen for real-time call events (PRIMARY source of call updates)
  useEffect(() => {
    if (!socketReady) {
      console.log("[UserDashboard] Waiting for socket to be ready...");
      return;
    }

    const socket = socketManager.getSocket();
    if (!socket) {
      console.error("[UserDashboard] Socket should be ready but getSocket() returned null");
      return;
    }

    console.log("[UserDashboard] 📡 Setting up event listeners on socket:", socket.id);

    // Debug: Log ALL socket events to see what we're receiving
    const debugHandler = (eventName: string, ...args: any[]) => {
      // Filter out ping/pong spam
      if (eventName !== "PONG" && eventName !== "PING") {
        console.log(`[UserDashboard] 🔍 Socket event: ${eventName}`, args);
      }
    };
    socket.onAny(debugHandler);

    const handleCallStarted = (data: any) => {
      console.log("[UserDashboard] 🔔 call-started event received (REAL-TIME):", data);
      
      // Ensure we have the required fields from socket event
      if (data.routerRtpCapabilities) {
        console.log("[UserDashboard] ✅ Setting active call from socket event with complete data");
        dispatch(setActiveCall({
          roomId: data.roomId,
          routerRtpCapabilities: data.routerRtpCapabilities,
          hostProducerId: data.hostProducerId || null,
          startedAt: new Date().toISOString(),
        }));
      } else {
        console.warn("[UserDashboard] ⚠️ call-started event missing router caps, fetching from API");
        // Fallback to API if socket event incomplete
        fetchActiveCall(true);
      }
    };

    const handleCallStopped = () => {
      console.log("[UserDashboard] 🔔 call-stopped event received (REAL-TIME)");
      // Clear active call immediately
      dispatch(clearActiveCall());
      console.log("[UserDashboard] ✅ Active call cleared from dashboard");
    };

    // Handle generic "message" events (backend sends broadcasts this way)
    const handleMessage = (data: any) => {
      console.log("[UserDashboard] 📨 message event received:", data);
      
      if (data.type === "call-started") {
        handleCallStarted(data);
      } else if (data.type === "call-stopped") {
        handleCallStopped();
      }
    };

    // Listen for both specific events AND generic "message" events
    socket.on("message", handleMessage);
    socket.on("call-started", handleCallStarted);
    socket.on("CALL_STARTED", handleCallStarted);
    socket.on("call-stopped", handleCallStopped);
    socket.on("CALL_STOPPED", handleCallStopped);
    
    // Debug: Log authentication status
    socket.on("authenticated", (data) => {
      console.log("[UserDashboard] ✅ Socket authenticated:", data);
    });

    console.log("[UserDashboard] ✅ All event listeners registered successfully");

    return () => {
      console.log("[UserDashboard] 🔌 Removing call event listeners");
      socket.offAny(debugHandler);
      socket.off("message", handleMessage);
      socket.off("call-started", handleCallStarted);
      socket.off("CALL_STARTED", handleCallStarted);
      socket.off("call-stopped", handleCallStopped);
      socket.off("CALL_STOPPED", handleCallStopped);
      socket.off("authenticated");
    };
  }, [dispatch, socketReady]);

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

