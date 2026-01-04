import React, { useState } from "react";
import { Dimensions, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fab } from "../../../components/ui/Fab";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { startCall } from "../../../state/callActions";
import { setThemeMode } from "../../../state/themeSlice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Consistent primary blue color for the entire app
const PRIMARY_BLUE = "#5B9FFF";

export default function HostDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const themeMode = useAppSelector((state) => state.theme.mode);
  
  const stats = [
    { label: "Total Users", value: "3", icon: "people" },
    { label: "Total Calls", value: "313", icon: "call" },
    { label: "Active Users", value: "3", icon: "person" },
    { label: "Network Status", value: "497ms", icon: "wifi", isLatency: true },
  ];
  
  const recent = [
    { title: "Call M272664 ended", detail: "04/12/2025 - 19:03", icon: "call-outline" },
  ];
  
  const connectionStatus = { connected: true };

  const handleStartCall = async () => {
    try {
      const roomId = await dispatch(startCall()).unwrap?.();
      router.push("/host/active-call");
    } catch (e) {
      // ignore here; startCall already handles errors upstream
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - replace with actual data fetching logic
    await new Promise(resolve => setTimeout(resolve, 1500));
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
                    <Ionicons name="wifi" size={20} color="#ef4444" style={styles.statIcon} />
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
      </View>
      <Fab
        icon="logo-whatsapp"
        accessibilityLabel="Contact via WhatsApp"
        onPress={() => Linking.openURL("https://wa.me/")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

