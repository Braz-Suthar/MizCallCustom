import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { apiFetch, API_BASE } from "../../../state/api";
import { useAppSelector } from "../../../state/store";

type HostRecordingsResponse = Record<
  string,
  Record<
    string,
    {
      id: string;
      time: string;
    }[]
  >
>;

type RecordingItem = {
  id: string;
  userName: string;
  date: string;
  time: string;
};

export default function HostRecordings() {
  const { colors } = useTheme();
  const token = useAppSelector((s) => s.auth.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecordingItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<HostRecordingsResponse>("/host/recordings", token);
        if (!mounted) return;
        const flattened: RecordingItem[] = [];
        for (const userName of Object.keys(res)) {
          const byDate = res[userName] || {};
          for (const date of Object.keys(byDate)) {
            for (const clip of byDate[date]) {
              flattened.push({ id: clip.id, userName, date, time: clip.time });
            }
          }
        }
        flattened.sort((a, b) => (a.date === b.date ? (a.time > b.time ? -1 : 1) : a.date > b.date ? -1 : 1));
        setData(flattened);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load recordings");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [token]);

  const onPlay = async (item: RecordingItem) => {
    if (!token) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${API_BASE}/recordings/${item.id}/stream`, headers: { Authorization: `Bearer ${token}` } },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(item.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if ((status as AVPlaybackStatusSuccess).didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (e) {
      setError("Playback failed");
      setPlayingId(null);
    }
  };

  const renderItem = ({ item }: { item: RecordingItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.userName}</Text>
      <Text style={[styles.cardMeta, { color: colors.text }]}>{item.date} · {item.time}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: playingId === item.id ? colors.primary : colors.border }]}
          onPress={() => onPlay(item)}
        >
          <Text style={[styles.playLabel, { color: colors.text }]}>{playingId === item.id ? "Playing..." : "Play"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const empty = !loading && data.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Recordings</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Access and play saved clips.</Text>

      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {error ? <Text style={[styles.error, { color: colors.text }]}>{error}</Text> : null}
      {empty ? <Text style={[styles.empty, { color: colors.text }]}>No recordings yet.</Text> : null}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12 }}
      />
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
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
  },
  error: {
    marginTop: 10,
  },
  empty: {
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    marginTop: 4,
    opacity: 0.8,
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  playButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  playLabel: {
    fontWeight: "600",
  },
});

