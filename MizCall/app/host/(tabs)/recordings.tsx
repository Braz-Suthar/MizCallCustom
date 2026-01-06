import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, API_BASE } from "../../../state/api";
import { useAppSelector } from "../../../state/store";

// Consistent primary blue color
const PRIMARY_BLUE = "#5B9FFF";

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

type DateGroup = {
  date: string;
  recordings: RecordingItem[];
  isExpanded: boolean;
};

export default function HostRecordings() {
  const { colors } = useTheme();
  const token = useAppSelector((s) => s.auth.token);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecordingItem[]>([]);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    // ensure audio plays even in silent mode (iOS)
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});

    load();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };

    async function load() {
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
        
        // Group by date
        const groups: Record<string, RecordingItem[]> = {};
        flattened.forEach(item => {
          if (!groups[item.date]) groups[item.date] = [];
          groups[item.date].push(item);
        });
        
        const dateGroupsArray: DateGroup[] = Object.keys(groups)
          .sort((a, b) => b.localeCompare(a))
          .map(date => ({
            date,
            recordings: groups[date],
            isExpanded: true, // Default to expanded
          }));
        
        setDateGroups(dateGroupsArray);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load recordings");
      } finally {
        if (mounted) setLoading(false);
      }
    }
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Trigger reload by updating a dependency or call load directly
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const toggleDateGroup = (date: string) => {
    setDateGroups(prev =>
      prev.map(group =>
        group.date === date ? { ...group, isExpanded: !group.isExpanded } : group
      )
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const onPlay = async (item: RecordingItem) => {
    if (!token) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      // ensure https for Android devices
      const streamUrl = `${API_BASE.replace("http://", "https://")}/recordings/${item.id}/stream?token=${encodeURIComponent(token)}`;
      console.log("[recordings] streamUrl", streamUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(item.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if ((status as AVPlaybackStatusSuccess).didJustFinish) {
          setPlayingId(null);
        } else if (!status.isLoaded && "error" in status && status.error) {
          setError(status.error);
          setPlayingId(null);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Playback failed");
      setPlayingId(null);
    }
  };

  const onStop = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
    }
  };

  const empty = !loading && data.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Recordings</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Access and play saved clips organized by date.</Text>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: "#ef444420", borderColor: "#ef4444" }]}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading recordings...</Text>
        </View>
      ) : null}

      {empty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={colors.text} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No recordings yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.text }]}>Recordings will appear here after calls</Text>
        </View>
      ) : null}

      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_BLUE}
            colors={[PRIMARY_BLUE]}
          />
        }
        renderItem={({ item: dateGroup }) => (
          <View style={styles.dateGroupContainer}>
            {/* Date Folder Header */}
            <Pressable
              style={[styles.dateHeader, { backgroundColor: colors.card }]}
              onPress={() => toggleDateGroup(dateGroup.date)}
            >
              <View style={styles.dateHeaderLeft}>
                <Ionicons
                  name={dateGroup.isExpanded ? "folder-open" : "folder"}
                  size={24}
                  color={PRIMARY_BLUE}
                />
                <View style={styles.dateInfo}>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(dateGroup.date)}
                  </Text>
                  <Text style={[styles.dateCount, { color: colors.text }]}>
                    {dateGroup.recordings.length} recording{dateGroup.recordings.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={dateGroup.isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.text}
              />
            </Pressable>

            {/* Recordings List */}
            {dateGroup.isExpanded && (
              <View style={styles.recordingsList}>
                {dateGroup.recordings.map((recording) => (
                  <View
                    key={recording.id}
                    style={[styles.recordingCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.recordingHeader}>
                      <View style={[styles.audioIcon, { backgroundColor: PRIMARY_BLUE + "20" }]}>
                        <Ionicons name="mic" size={20} color={PRIMARY_BLUE} />
                      </View>
                      <View style={styles.recordingInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{recording.userName}</Text>
                        <Text style={[styles.recordingTime, { color: colors.text }]}>{recording.time}</Text>
                      </View>
                    </View>

                    <View style={styles.recordingActions}>
                      {playingId === recording.id ? (
                        <>
                          <Pressable
                            style={[styles.actionButton, styles.stopButton]}
                            onPress={onStop}
                          >
                            <Ionicons name="stop" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Stop</Text>
                          </Pressable>
                          <View style={styles.playingIndicator}>
                            <View style={[styles.waveBar, { backgroundColor: PRIMARY_BLUE }]} />
                            <View style={[styles.waveBar, { backgroundColor: PRIMARY_BLUE }]} />
                            <View style={[styles.waveBar, { backgroundColor: PRIMARY_BLUE }]} />
                          </View>
                        </>
                      ) : (
                        <Pressable
                          style={[styles.actionButton, styles.playButton, { backgroundColor: PRIMARY_BLUE }]}
                          onPress={() => onPlay(recording)}
                        >
                          <Ionicons name="play" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Play</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.actionButton, styles.downloadButton, { borderColor: colors.border }]}
                        onPress={() => {}}
                      >
                        <Ionicons name="download-outline" size={18} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    opacity: 0.8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#ef4444",
    fontSize: 14,
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
  },
  dateGroupContainer: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateInfo: {
    gap: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
  },
  dateCount: {
    fontSize: 13,
    opacity: 0.6,
  },
  recordingsList: {
    marginTop: 8,
    paddingLeft: 20,
    gap: 8,
  },
  recordingCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  audioIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  recordingTime: {
    fontSize: 13,
    opacity: 0.7,
  },
  recordingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  playButton: {
    flex: 1,
  },
  stopButton: {
    flex: 1,
    backgroundColor: "#ef4444",
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  playingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  waveBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    opacity: 0.7,
  },
});

