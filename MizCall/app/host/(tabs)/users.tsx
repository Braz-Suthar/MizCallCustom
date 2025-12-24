import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Fab } from "../../../components/ui/Fab";
import { apiFetch } from "../../../state/api";
import { useAppSelector } from "../../../state/store";

export default function HostUsers() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token, role } = useAppSelector((s) => s.auth);
  const [users, setUsers] = useState<Array<{ id: string; username: string; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token || role !== "host") return;
    setLoading(true);
    try {
      const res = await apiFetch<{ users: { id: string; username: string; enabled: boolean }[] }>(
        "/host/users",
        token,
      );
      setUsers(res.users);
    } catch (e) {
      // silently ignore for now; could show toast
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [token, role]),
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Users</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Manage and view all registered users.</Text>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.username}</Text>
                <Text style={[styles.chip, { backgroundColor: item.enabled ? "#22c55e22" : "#f9731622", color: item.enabled ? "#16a34a" : "#ea580c" }]}>
                  {item.enabled ? "Active" : "Disabled"}
                </Text>
              </View>
              <Text style={[styles.cardId, { color: colors.text }]}>{item.id}</Text>
            </View>
          )}
          ListEmptyComponent={
            !loading ? <Text style={[styles.empty, { color: colors.text }]}>No users yet</Text> : null
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 80, gap: 10 }}
        />
      </View>
      <Fab icon="person-add" accessibilityLabel="Add user" onPress={() => router.push("/host/create-user")} />
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
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardId: {
    opacity: 0.8,
    fontWeight: "500",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    opacity: 0.7,
  },
});

