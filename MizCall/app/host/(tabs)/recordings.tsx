import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, API_BASE } from "../../../state/api";
import { useAppSelector } from "../../../state/store";

// Consistent primary blue color
const PRIMARY_BLUE = "#5B9FFF";
const DANGER_RED = "#ef4444";

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

type GroupedUser = {
  userName: string;
  dates: {
    date: string;
    recordings: RecordingItem[];
  }[];
};

export default function HostRecordings() {
  const { colors } = useTheme();
  const token = useAppSelector((s) => s.auth.token);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GroupedUser[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
   const [confirm, setConfirm] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
  }>({ visible: false });
  const soundRef = useRef<Audio.Sound | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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
        const grouped: GroupedUser[] = Object.keys(res).map((userName) => {
          const byDate = res[userName] || {};
          const dates = Object.keys(byDate)
            .sort((a, b) => (a > b ? -1 : 1))
            .map((date) => ({
              date,
              recordings: (byDate[date] || [])
                .slice()
                .sort((a, b) => (a.time > b.time ? -1 : 1))
                .map((clip) => ({ id: clip.id, userName, date, time: clip.time })),
            }));
          return { userName, dates };
        });
        setData(grouped);
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
    try {
      const res = await apiFetch<HostRecordingsResponse>("/host/recordings", token!);
      const grouped: GroupedUser[] = Object.keys(res).map((userName) => {
        const byDate = res[userName] || {};
        const dates = Object.keys(byDate)
          .sort((a, b) => (a > b ? -1 : 1))
          .map((date) => ({
            date,
            recordings: (byDate[date] || [])
              .slice()
              .sort((a, b) => (a.time > b.time ? -1 : 1))
              .map((clip) => ({ id: clip.id, userName, date, time: clip.time })),
          }));
        return { userName, dates };
      });
      setData(grouped);
    } catch (e) {
      // ignore refresh errors
    }
    setRefreshing(false);
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
    
    setPlayingId(item.id);
    setError(null);
    
    try {
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      // For iOS: Download file first (AVFoundation doesn't handle streaming well with auth)
      const streamUrl = `${API_BASE.replace("http://", "https://")}/recordings/${item.id}/stream?token=${encodeURIComponent(token)}`;
      console.log("[recordings] Downloading recording for playback:", streamUrl);
      
      // Create sound with proper headers
      const { sound } = await Audio.Sound.createAsync(
        { 
          uri: streamUrl,
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        },
        { 
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        (status) => {
          // Playback status callback
          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log("[recordings] Playback finished");
              setPlayingId(null);
            }
          } else if ('error' in status) {
            console.error("[recordings] Playback error:", status.error);
            setError(status.error || "Playback failed");
            setPlayingId(null);
          }
        }
      );
      
      soundRef.current = sound;
      console.log("[recordings] Playback started successfully");
      
    } catch (e: any) {
      console.error("[recordings] Play error:", e);
      setError(e?.message || "Failed to play recording");
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

  const deleteClips = async (ids: string[]) => {
    if (!token || !ids.length) return;
    setDeleting(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`${API_BASE}/host/recordings/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setData((prev) =>
        prev
          .map((u) => ({
            ...u,
            dates: u.dates
              .map((d) => ({
                ...d,
                recordings: d.recordings.filter((r) => !ids.includes(r.id)),
              }))
              .filter((d) => d.recordings.length > 0),
          }))
          .filter((u) => u.dates.length > 0)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete recordings");
    } finally {
      setDeleting(false);
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
        data={data}
        keyExtractor={(item) => item.userName}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_BLUE}
            colors={[PRIMARY_BLUE]}
          />
        }
        renderItem={({ item }) => {
          const userExpanded = expandedUsers.has(item.userName);
          return (
            <View style={[styles.userBlock, { borderColor: colors.border }]}>
              <View style={[styles.userHeader, { backgroundColor: colors.card }]}>
                <Pressable
                  style={styles.userHeaderTap}
                  onPress={() => {
                    const next = new Set(expandedUsers);
                    userExpanded ? next.delete(item.userName) : next.add(item.userName);
                    setExpandedUsers(next);
                  }}
                >
                  <View style={styles.dateHeaderLeft}>
                    <Ionicons
                      name={userExpanded ? "folder-open" : "folder"}
                      size={22}
                      color={PRIMARY_BLUE}
                    />
                    <View style={styles.dateInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
                      <Text style={[styles.dateCount, { color: colors.text }]}>
                        {item.dates.reduce((sum, d) => sum + d.recordings.length, 0)} clips
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={userExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
                <Pressable
                  disabled={deleting}
                  onPress={() =>
                    setConfirm({
                      visible: true,
                      title: "Delete user recordings",
                      message: `Delete all recordings for ${item.userName}?`,
                      onConfirm: () => deleteClips(item.dates.flatMap((d) => d.recordings.map((r) => r.id))),
                    })
                  }
                  style={styles.deleteIcon}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </Pressable>
              </View>

              {userExpanded ? (
                <View style={styles.recordingsList}>
                  {item.dates.map((d) => {
                    const key = `${item.userName}:${d.date}`;
                    const dateExpanded = expandedDates.has(key);
                    return (
                      <View key={key} style={styles.dateGroupContainer}>
                        <Pressable
                          style={[styles.dateHeader, { backgroundColor: colors.background }]}
                          onPress={() => {
                            const next = new Set(expandedDates);
                            dateExpanded ? next.delete(key) : next.add(key);
                            setExpandedDates(next);
                          }}
                        >
                          <View style={styles.dateHeaderLeft}>
                            <Ionicons
                              name={dateExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={colors.text}
                            />
                            <View style={styles.dateInfo}>
                              <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(d.date)}</Text>
                              <Text style={[styles.dateCount, { color: colors.text }]}>
                                {d.recordings.length} recording{d.recordings.length > 1 ? "s" : ""}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            disabled={deleting}
                            onPress={() =>
                              setConfirm({
                                visible: true,
                                title: "Delete date folder",
                                message: `Delete all recordings for ${formatDate(d.date)}?`,
                                onConfirm: () => deleteClips(d.recordings.map((r) => r.id)),
                              })
                            }
                            style={styles.deleteIcon}
                          >
                            <Ionicons name="trash" size={16} color="#ef4444" />
                          </Pressable>
                        </Pressable>

                        {dateExpanded ? (
                          <View style={styles.recordingsList}>
                            {d.recordings.map((recording) => (
                              <View
                                key={recording.id}
                                style={[styles.recordingCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                              >
                                <View style={styles.recordingHeader}>
                                  <View style={[styles.audioIcon, { backgroundColor: PRIMARY_BLUE + "20" }]}>
                                    <Ionicons name="mic" size={20} color={PRIMARY_BLUE} />
                                  </View>
                                  <View style={styles.recordingInfo}>
                                    <Text style={[styles.userName, { color: colors.text }]}>{recording.time}</Text>
                                    <Text style={[styles.recordingTime, { color: colors.text }]}>{recording.date}</Text>
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
                                    disabled={deleting}
                                    style={[styles.actionButton, styles.downloadButton, { borderColor: colors.border }]}
                                    onPress={() =>
                                      setConfirm({
                                        visible: true,
                                        title: "Delete recording",
                                        message: "Delete this recording?",
                                        onConfirm: () => deleteClips([recording.id]),
                                      })
                                    }
                                  >
                                    <Ionicons name="trash" size={18} color="#ef4444" />
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        }}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 80 }}
      />
      {confirm.visible ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{confirm.title ?? "Confirm"}</Text>
            {confirm.message ? (
              <Text style={[styles.modalMessage, { color: colors.text }]}>{confirm.message}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setConfirm({ visible: false })}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalDestructive, { backgroundColor: DANGER_RED }]}
                onPress={() => {
                  setConfirm({ visible: false });
                  confirm.onConfirm?.();
                }}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextDestructive]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
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
  userBlock: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  userHeaderTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordingsList: {
    marginTop: 8,
    paddingLeft: 20,
    gap: 8,
  },
  deleteIcon: {
    padding: 8,
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
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancel: {
    borderWidth: 1,
  },
  modalDestructive: {
  },
  modalButtonText: {
    color: "#111",
    fontWeight: "600",
  },
  modalButtonTextDestructive: {
    color: "#fff",
  },
});

