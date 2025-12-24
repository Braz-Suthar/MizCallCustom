import React, { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { useAppDispatch, useAppSelector } from "../../state/store";
import { endCall, startCall } from "../../state/callActions";

export default function ActiveCallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((s) => s.call.activeCall);
  const callStatus = useAppSelector((s) => s.call.status);
  const callError = useAppSelector((s) => s.call.error);
  const participants = useAppSelector((s) => s.call.participants);
  const [muted, setMuted] = useState(false);

  const participantData = useMemo(
    () =>
      participants.map((p) => ({
        id: p,
        username: p,
        userId: p,
        speaking: false,
      })),
    [participants],
  );

  const onStart = async () => {
    try {
      await dispatch(startCall()).unwrap?.();
    } catch {
      // errors already surfaced via state
    }
  };

  const onEnd = () => {
    dispatch(endCall());
    router.back();
  };

  const hasCall = !!activeCall || callStatus === "starting";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Active Call</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Monitor participants and control the call.</Text>

      {hasCall ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Current call</Text>
          <Text style={[styles.cardDetail, { color: colors.text }]}>
            Room: {activeCall?.roomId ?? "starting..."}
          </Text>
          <Text style={[styles.cardDetail, { color: colors.text }]}>
            Status: {callStatus === "starting" ? "Starting…" : "Active"}
          </Text>
          {callError ? <Text style={[styles.error, { color: colors.text }]}>{callError}</Text> : null}

          <View style={styles.participants}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Joined users</Text>
            {participantData.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text }]}>Waiting for users…</Text>
            ) : (
              <FlatList
                data={participantData}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ gap: 12, paddingTop: 6 }}
                renderItem={({ item }) => (
                  <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text style={[styles.userId, { color: colors.text }]} numberOfLines={1}>
                      {item.userId}
                    </Text>
                    <Text style={[styles.speaking, { color: item.speaking ? "#22c55e" : colors.text }]}>
                      {item.speaking ? "Speaking" : "Idle"}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>

          <View style={styles.actions}>
            <AppButton
              label={muted ? "Unmute" : "Mute"}
              variant="secondary"
              onPress={() => setMuted((m) => !m)}
              fullWidth
            />
            <AppButton
              label="End call"
              variant="secondary"
              onPress={onEnd}
              disabled={callStatus === "starting"}
              fullWidth
            />
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No active call</Text>
          <Text style={[styles.empty, { color: colors.text }]}>Start a call to see participants here.</Text>
          <AppButton label="Start call" onPress={onStart} fullWidth />
        </View>
      )}
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
  cardDetail: {
    opacity: 0.85,
  },
  sectionLabel: {
    fontWeight: "700",
    marginBottom: 4,
  },
  participants: {
    gap: 4,
  },
  empty: {
    opacity: 0.7,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  error: {
    color: "#ef4444",
    marginTop: 4,
  },
  userCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  userName: {
    fontWeight: "700",
    fontSize: 15,
  },
  userId: {
    opacity: 0.8,
  },
  speaking: {
    fontWeight: "600",
  },
});

