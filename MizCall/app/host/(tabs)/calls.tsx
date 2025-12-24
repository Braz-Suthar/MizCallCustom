import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Fab } from "../../../components/ui/Fab";
import { AppButton } from "../../../components/ui/AppButton";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { endCall, startCall } from "../../../state/callActions";

export default function HostCalls() {
  const { colors } = useTheme();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callStatus = useAppSelector((s) => s.call.status);
  const callError = useAppSelector((s) => s.call.error);
  const participants = useAppSelector((s) => s.call.participants);
  const dispatch = useAppDispatch();

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Calls</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Track active and historical calls.</Text>

        {activeCall || callStatus === "starting" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Active call</Text>
            <Text style={[styles.cardDetail, { color: colors.text }]}>
              Room: {activeCall?.roomId ?? "starting..."}
            </Text>
            {callError ? <Text style={[styles.error, { color: colors.text }]}>{callError}</Text> : null}
            <View style={styles.participants}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Joined users</Text>
              {participants.length === 0 ? (
                <Text style={[styles.empty, { color: colors.text }]}>Waiting for users…</Text>
              ) : (
                participants.map((p) => (
                  <Text key={p} style={[styles.participant, { color: colors.text }]}>
                    {p}
                  </Text>
                ))
              )}
            </View>
            <View style={styles.actions}>
              <AppButton
                label={callStatus === "starting" ? "Starting..." : "Join call"}
                onPress={() => {}}
                disabled={callStatus === "starting"}
                fullWidth
              />
              <AppButton
                label="End call"
                variant="secondary"
                onPress={() => dispatch(endCall())}
                fullWidth
              />
              <AppButton
                label="Open active call screen"
                variant="ghost"
                onPress={() => router.push("/host/active-call")}
                fullWidth
              />
            </View>
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.text }]}>No active call</Text>
        )}
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
  cardDetail: {
    opacity: 0.8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  empty: {
    marginTop: 16,
    opacity: 0.7,
  },
  error: {
    marginTop: 4,
    color: "#ef4444",
  },
  participants: {
    marginTop: 8,
    gap: 4,
  },
  participant: {
    opacity: 0.9,
  },
});

