import React, { useEffect, useState, useMemo } from "react";
import { Dimensions, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { Fab } from "../../../components/ui/Fab";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { startCall } from "../../../state/callActions";
import { setThemeMode } from "../../../state/themeSlice";
import { apiFetch, API_BASE } from "../../../state/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Consistent primary blue color for the entire app
const PRIMARY_BLUE = "#5B9FFF";

type DashboardData = {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalCalls: number;
    activeCalls: number;
  };
  recentActivity: Array<{
    type: "call" | "user";
    id: string;
    status: string;
    createdAt: string;
    username?: string;
  }>;
};

export default function HostDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [networkLatency, setNetworkLatency] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const themeMode = useAppSelector((state) => state.theme.mode);
  const { token, role } = useAppSelector((state) => state.auth);
  const socketRef = React.useRef<Socket | null>(null);
  
  // Connection is good if we have latency data and it's under 1000ms
  // WebSocket connection is preferred but not required
  const connectionStatus = { 
    connected: networkLatency !== null && networkLatency < 1000 
  };

  // Update connection status whenever latency changes
  useEffect(() => {
    if (networkLatency !== null) {
      console.log("[Dashboard] Network status updated:", 
        connectionStatus.connected ? "🟢 Connected" : "🔴 Disconnected",
        `(${networkLatency}ms)`
      );
    }
  }, [networkLatency]);

  const loadDashboardData = async () => {
    if (!token || role !== "host") return;

    try {
      // Measure API latency if WebSocket is not connected
      const startTime = Date.now();
      const data = await apiFetch<DashboardData>("/host/dashboard", token);
      const endTime = Date.now();
      
      setDashboardData(data);
      
      // Only update latency from API if WebSocket is not connected
      if (!wsConnected) {
        const apiLatency = endTime - startTime;
        setNetworkLatency(apiLatency);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setNetworkLatency(null);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO connection for real-time ping and latency
  useEffect(() => {
    if (!token) return;

    console.log("[Dashboard] Connecting to Socket.IO...");

    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      autoConnect: true,
      auth: {
        token
      }
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Dashboard] Socket.IO connected:", socket.id);
      setWsConnected(true);
      
      // Send auth message
      socket.emit("AUTH", { type: "AUTH", token });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Dashboard] Socket.IO disconnected:", reason);
      setWsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.log("[Dashboard] Connection error:", error.message);
      setWsConnected(false);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`[Dashboard] Reconnect attempt ${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
      console.log(`[Dashboard] Reconnected after ${attempt} attempts`);
      setWsConnected(true);
    });

    // Handle PING message
    socket.on("PING", (data) => {
      socket.emit("PONG", { type: "PONG", timestamp: data.timestamp });
    });

    // Handle latency updates
    socket.on("LATENCY_UPDATE", (data) => {
      setNetworkLatency(data.latency);
      console.log("[Dashboard] Network status updated:", 
        data.latency < 1000 ? "🟢 Connected" : "🔴 Disconnected", 
        `(${data.latency}ms)`);
    });

    return () => {
      console.log("[Dashboard] Cleaning up Socket.IO...");
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token]);

  // Load data on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [token, role])
  );

  const stats = useMemo(() => [
    { 
      label: "Total Users", 
      value: dashboardData?.stats.totalUsers?.toString() || "0", 
      icon: "people" as const
    },
    { 
      label: "Total Calls", 
      value: dashboardData?.stats.totalCalls?.toString() || "0", 
      icon: "call" as const
    },
    { 
      label: "Active Users", 
      value: dashboardData?.stats.activeUsers?.toString() || "0", 
      icon: "person" as const
    },
    { 
      label: "Network Status", 
      value: networkLatency !== null ? `${networkLatency}ms` : "---", 
      icon: "wifi" as const, 
      isLatency: true 
    },
  ], [dashboardData, networkLatency]);
  
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityTitle = (activity: DashboardData["recentActivity"][0]) => {
    if (activity.type === "call") {
      return `Call ${activity.id.slice(0, 6)} ${activity.status}`;
    } else {
      return `User ${activity.username || activity.id} ${activity.status}`;
    }
  };

  const getActivityIcon = (activity: DashboardData["recentActivity"][0]): "call" | "call-outline" | "person" | "person-outline" => {
    if (activity.type === "call") {
      return activity.status === "started" ? "call" : "call-outline";
    } else {
      return activity.status === "active" ? "person" : "person-outline";
    }
  };
  
  const recent = dashboardData?.recentActivity.map(activity => ({
    title: getActivityTitle(activity),
    detail: formatActivityTime(activity.createdAt),
    icon: getActivityIcon(activity),
  })) || [];

  const handleStartCall = async () => {
    try {
      const result = await dispatch(startCall()) as any;
      if (result && typeof result.unwrap === 'function') {
        await result.unwrap();
      }
      router.push("/host/active-call");
    } catch (e) {
      // ignore here; startCall already handles errors upstream
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const toggleTheme = () => {
    const newTheme = themeMode === "dark" ? "light" : "dark";
    dispatch(setThemeMode(newTheme));
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image 
                source={require("../../../assets/Icons_and_logos_4x/wave_logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton} onPress={toggleTheme}>
              <Ionicons 
                name={themeMode === "dark" ? "sunny" : "moon"} 
                size={24} 
                color={colors.text} 
              />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Ionicons 
                name={connectionStatus.connected ? "wifi" : "wifi-outline"} 
                size={24} 
                color={connectionStatus.connected ? "#22c55e" : "#ef4444"}
              />
            </Pressable>
          </View>
        </View>

        {loading && !dashboardData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_BLUE} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading dashboard...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PRIMARY_BLUE}
                colors={[PRIMARY_BLUE]}
              />
            }
          >
          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <Pressable 
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleStartCall}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>New Call</Text>
              </Pressable>
              <Pressable 
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => router.push("/host/create-user")}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Create User</Text>
              </Pressable>
          </View>
        </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View 
                key={stat.label} 
                style={[
                  styles.statCard, 
                  { backgroundColor: colors.card },
                  SCREEN_WIDTH < 600 && styles.statCardSmall
                ]}
              >
                <Text style={[styles.statLabel, { color: colors.text }]}>{stat.label}</Text>
                <View style={styles.statValueRow}>
                  {stat.isLatency && (
                    <Ionicons 
                      name="wifi" 
                      size={20} 
                      color={connectionStatus.connected ? "#22c55e" : "#ef4444"} 
                      style={styles.statIcon} 
                    />
                  )}
                  <Text style={[styles.statValue, { color: PRIMARY_BLUE }]}>{stat.value}</Text>
                </View>
              </View>
            ))}
        </View>

          {/* Recent Activity */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <View style={styles.activityList}>
              {recent.map((item, index) => (
                <View 
                  key={index} 
                  style={[styles.activityCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.activityIconContainer}>
                    <Ionicons name={item.icon} size={24} color={PRIMARY_BLUE} />
                  </View>
                  <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.activityDetail, { color: colors.text }]}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        </ScrollView>
        )}
      </View>
      <Fab
        icon="logo-whatsapp"
        accessibilityLabel="Contact via WhatsApp"
        onPress={() => Linking.openURL("https://wa.me/")}
        style={{ backgroundColor: "#25D366" }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: PRIMARY_BLUE,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 8,
  },
  statCard: {
    width: (SCREEN_WIDTH - 56) / 2, // Proper 2 column layout: (screen width - padding - gap) / 2
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 120,
    justifyContent: "space-between",
  },
  statCardSmall: {
    minHeight: 110,
    padding: 16,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statIcon: {
    marginRight: 4,
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PRIMARY_BLUE}25`,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 14,
    opacity: 0.7,
  },
});

