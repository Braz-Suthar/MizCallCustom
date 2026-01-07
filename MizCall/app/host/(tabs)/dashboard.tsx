import React, { useEffect, useState, useMemo } from "react";
import { Dimensions, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator, Platform, useColorScheme } from "react-native";
import { Image as SvgIcon } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab } from "../../../components/ui/Fab";
import { ActiveCallModal } from "../../../components/ui/ActiveCallModal";
import { WaveLoader } from "../../../components/WaveLoader";
import { socketManager } from "../../../services/socketManager";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { startCall } from "../../../state/callActions";
import { setThemeMode } from "../../../state/themeSlice";
import { apiFetch, API_BASE } from "../../../state/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ICONS = {
  callPlus: require("../../../assets/ui_icons/Call_Plus.svg"),
  userPlus: require("../../../assets/ui_icons/Person_User_Plus.svg"),
  wifi: require("../../../assets/ui_icons/Wifi.svg"),
  wifiSlash: require("../../../assets/ui_icons/Wifi_Slash.svg"),
};

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
  const PRIMARY_BLUE = colors.primary;
  const PRIMARY_BG = (colors as any).primaryBackground ?? colors.primary;
  const systemScheme = useColorScheme() ?? "light";
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [networkLatency, setNetworkLatency] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const themeMode = useAppSelector((state) => state.theme.mode);
  const { token, role } = useAppSelector((state) => state.auth);
  const activeCall = useAppSelector((state) => state.call.activeCall);
  const callStatus = useAppSelector((state) => state.call.status);
  const [callLogs, setCallLogs] = useState<Array<{ id: string; status: string }>>([]);
  const [showActiveCallModal, setShowActiveCallModal] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const isDark = (() => {
    const bg = colors.background;
    const hexMatch = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1].length === 3 ? hexMatch[1].split("").map((c) => c + c).join("") : hexMatch[1];
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luminance < 128;
    }
    const rgbMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luminance < 128;
    }
    return false;
  })();
  
  // Log theme info for debugging
  useEffect(() => {
    console.log("[Dashboard] Theme:", {
      isDark,
      background: colors.background,
      text: colors.text,
      statValueColor: isDark ? "#93c5fd" : colors.text
    });
  }, [isDark, colors.background, colors.text]);
  
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

      // Also load call logs to check for active calls
      const callsRes = await apiFetch<{ calls: Array<{ id: string; status: string }> }>("/host/calls", token);
      setCallLogs(callsRes.calls || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setNetworkLatency(null);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO connection for real-time ping and latency - persists across app
  useEffect(() => {
    if (!token) return;

    console.log("[Dashboard] Initializing socket connection...");
    const socket = socketManager.initialize(token);

    // Set up latency callback
    socketManager.setLatencyCallback((latency) => {
      setNetworkLatency(latency);
      setWsConnected(true);
      console.log("[Dashboard] Network status updated:", 
        latency < 1000 ? "🟢 Connected" : "🔴 Disconnected", 
        `(${latency}ms)`);
    });

    socketManager.setStatusCallback((connected) => {
      setWsConnected(connected);
      if (!connected) {
        setNetworkLatency(null);
      }
    });

    // Check connection status
    setWsConnected(socketManager.isConnected());

    // No cleanup - socket persists across navigation
    // Only cleanup happens on logout via socketManager.cleanup()
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
    // Prevent double-tap
    if (isStartingCall) return;
    
    // Check if there's already an active call in Redux state or call logs
    if (activeCall || callStatus === "starting" || callLogs.find(call => call.status !== "ended")) {
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
    } catch (e) {
      console.error("[handleStartCall] Error starting call:", e);
      // ignore here; startCall already handles errors upstream
    } finally {
      setIsStartingCall(false);
    }
  };

  const handleViewActiveCall = () => {
    setShowActiveCallModal(false);
    router.push("/host/calls" as any);
  };

  const handleCancelModal = () => {
    setShowActiveCallModal(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const toggleTheme = () => {
    const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
    const newTheme = resolvedScheme === "dark" ? "light" : "dark";
    dispatch(setThemeMode(newTheme));
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, Platform.OS === "android" && styles.headerAndroid]}>
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
                name={(themeMode === "system" ? systemScheme : themeMode) === "dark" ? "sunny" : "moon"} 
                size={24} 
                color={colors.text} 
              />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <SvgIcon
                source={connectionStatus.connected ? ICONS.wifi : ICONS.wifiSlash}
                style={{ width: 24, height: 24 }}
                tintColor={connectionStatus.connected ? "#22c55e" : "#ef4444"}
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
                style={[
                  styles.actionButton, 
                  styles.primaryButton,
                  { backgroundColor: PRIMARY_BLUE },
                  isStartingCall && styles.actionButtonDisabled
                ]}
                onPress={handleStartCall}
                disabled={isStartingCall}
              >
                {isStartingCall ? (
                  <WaveLoader variant={isDark ? "white" : "white"} size="small" />
                ) : (
                  <Ionicons name="call" size={20} color="#fff" />
                )}
                <Text style={styles.actionButtonText}>
                  {isStartingCall ? "Starting..." : "New Call"}
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: PRIMARY_BLUE }]}
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
                  <Ionicons 
                    name={stat.icon} 
                    size={20} 
                    color={stat.isLatency 
                      ? (connectionStatus.connected ? "#22c55e" : "#ef4444")
                      : PRIMARY_BLUE
                    } 
                    style={styles.statIcon} 
                  />
                  <Text style={[styles.statValue, { color: isDark ? "#93c5fd" : colors.text }]}>
                    {stat.value}
                  </Text>
                </View>
              </View>
            ))}
        </View>

          {/* Recent Activity */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <View style={styles.activityList}>
              {recent.length === 0 ? (
                <View style={[styles.emptyActivity, { backgroundColor: colors.card }]}>
                  <Ionicons name="time-outline" size={28} color={colors.text} style={{ opacity: 0.6 }} />
                  <Text style={[styles.emptyActivityText, { color: colors.text }]}>
                    No recent activity
                  </Text>
                  <Text style={[styles.emptyActivitySub, { color: colors.text }]}>
                    New calls or users will appear here.
                  </Text>
                </View>
              ) : (
                recent.map((item, index) => (
                  <View 
                    key={index} 
                    style={[styles.activityCard, { backgroundColor: colors.card }]}
                  >
                    <View style={[styles.activityIconContainer, { backgroundColor: PRIMARY_BG }]}>
                      <Ionicons name={item.icon} size={24} color={PRIMARY_BLUE} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.activityDetail, { color: colors.text }]}>{item.detail}</Text>
                    </View>
                  </View>
                ))
              )}
          </View>
        </View>
        </ScrollView>
        )}
      </View>

      {/* Active Call Modal */}
      <ActiveCallModal
        visible={showActiveCallModal}
        title="Active Call Exists"
        message="You already have an active call. Would you like to view it in the Calls section?"
        onCancel={handleCancelModal}
        onConfirm={handleViewActiveCall}
        confirmText="View Call"
        cancelText="Cancel"
      />

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
  headerAndroid: {
    marginTop: 12,
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
  },
  primaryButton: {
  },
  actionButtonDisabled: {
    opacity: 0.6,
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
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  emptyActivity: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  emptyActivityText: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyActivitySub: {
    fontSize: 13,
    opacity: 0.7,
  },
});

