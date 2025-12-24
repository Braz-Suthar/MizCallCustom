import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { AppButton } from "../../../components/ui/AppButton";
import { useAppSelector } from "../../../state/store";
import { useJoinCall } from "../../../hooks/useJoinCall";

export default function UserDashboard() {
  const { colors } = useTheme();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const { join, state, error } = useJoinCall();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>User Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Quick access to your recordings and activity.</Text>

      {activeCall ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Active call</Text>
          <Text style={[styles.cardSub, { color: colors.text }]}>Room: {activeCall.roomId}</Text>
          <AppButton
            label={state === "connecting" ? "Joining..." : "Join call"}
            onPress={join}
            disabled={state === "connecting"}
            fullWidth
          />
          {error ? <Text style={[styles.error, { color: colors.text }]}>{error}</Text> : null}
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.text }]}>No active calls</Text>
      )}
    </View>
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
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSub: {
    opacity: 0.8,
  },
  empty: {
    marginTop: 16,
    opacity: 0.7,
  },
});

