import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { useAppSelector } from "../../state/store";
import { useJoinCall } from "../../hooks/useJoinCall";

export default function UserActiveCallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const { join, state, error } = useJoinCall();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!hasJoinedRef.current && activeCall?.routerRtpCapabilities) {
      hasJoinedRef.current = true;
      join();
    }
  }, [activeCall?.routerRtpCapabilities, join, activeCall]);

  const onLeave = () => {
    hasJoinedRef.current = false;
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>You can join, listen, and leave this call.</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activeCall ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Room: {activeCall.roomId}</Text>
            <Text style={[styles.status, { color: colors.text }]}>
              Status: {state === "connecting" ? "Connecting…" : state === "connected" ? "Connected" : "Idle"}
            </Text>
            <AppButton
              label={state === "connected" ? "Rejoin" : "Join call"}
              onPress={() => {
                hasJoinedRef.current = true;
                join();
              }}
              disabled={state === "connecting"}
              fullWidth
            />
            <AppButton label="Leave" variant="secondary" onPress={onLeave} fullWidth />
            {error ? <Text style={[styles.error, { color: colors.text }]}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No active call</Text>
            <Text style={[styles.status, { color: colors.text }]}>Return to dashboard to wait for a call.</Text>
            <AppButton label="Back" variant="secondary" onPress={onLeave} fullWidth />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.8,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
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
  status: {
    opacity: 0.85,
  },
  error: {
    color: "#ef4444",
  },
});


