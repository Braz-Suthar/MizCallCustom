import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Fab } from "../../../components/ui/Fab";
import { AppButton } from "../../../components/ui/AppButton";

export default function HostDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const stats = [
    { label: "Total users", value: "128" },
    { label: "Total calls", value: "342" },
    { label: "Active users", value: "58" },
    { label: "Latency", value: "42 ms" },
  ];
  const recent = [
    { title: "Call started", detail: "Room #8452 • 2m ago" },
    { title: "User added", detail: "ID U123456 • 10m ago" },
    { title: "Recording saved", detail: "Call #8421 • 32m ago" },
  ];
  const connectionStatus = { label: "Connected", color: "#22c55e" };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Host Dashboard</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>Overview of users, calls and recordings.</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: connectionStatus.color }]}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>{connectionStatus.label}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <AppButton label="Start New Call" onPress={() => {}} fullWidth />
            </View>
            <View style={styles.half}>
              <AppButton
                label="Create New User"
                variant="secondary"
                onPress={() => router.push("/host/create-user")}
                fullWidth
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Stats</Text>
          <View style={styles.statsGrid}>
            {stats.map((item) => (
              <View key={item.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
          <View style={styles.activityList}>
            {recent.map((item) => (
              <View key={item.detail} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.activityDetail, { color: colors.text }]}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "48%",
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    marginTop: 4,
    opacity: 0.7,
    fontWeight: "500",
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1f80ff",
    marginTop: 6,
  },
  activityTitle: {
    fontWeight: "700",
  },
  activityDetail: {
    opacity: 0.75,
    marginTop: 2,
  },
});

