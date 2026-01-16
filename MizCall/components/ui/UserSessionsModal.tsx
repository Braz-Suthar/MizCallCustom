import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";
import { authApiFetch } from "../../state/authActions";
import { useAppDispatch } from "../../state/store";

const SUCCESS_GREEN = "#22c55e";
const DANGER_RED = "#ef4444";
const WARNING_ORANGE = "#f59e0b";

type Session = {
  id: string;
  deviceLabel?: string | null;
  deviceName?: string | null;
  modelName?: string | null;
  platform?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  createdAt?: string;
  lastSeenAt?: string;
};

type SessionRequest = {
  id: string;
  deviceLabel: string;
  deviceName?: string | null;
  modelName?: string | null;
  platform?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  requestedAt: string;
};

type UserSessionsModalProps = {
  visible: boolean;
  userId: string | null;
  username: string | null;
  onClose: () => void;
};

export function UserSessionsModal({ visible, userId, username, onClose }: UserSessionsModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingRequests, setPendingRequests] = useState<SessionRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const res = await dispatch<any>(authApiFetch<{ sessions: Session[]; pendingRequests: SessionRequest[] }>(
        `/host/users/${userId}/sessions`
      ));
      
      console.log('[UserSessions] Fetched sessions:', JSON.stringify(res.sessions, null, 2));
      
      setSessions(res.sessions || []);
      setPendingRequests(res.pendingRequests || []);
    } catch (e) {
      console.error("Error fetching user sessions:", e);
      Alert.alert("Error", "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && userId) {
      fetchSessions();
    }
  }, [visible, userId]);

  const handleApprove = async (requestId: string) => {
    if (!userId) return;
    
    Alert.alert(
      "Approve Session",
      "This will revoke all existing sessions for this user and approve the new device. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setActionLoading(requestId);
            try {
              await dispatch<any>(authApiFetch(
                `/host/users/${userId}/sessions/approve`,
                {
                  method: "POST",
                  body: JSON.stringify({ requestId }),
                }
              ));
              
              Alert.alert("Success", "Session approved. User can now login on the new device.");
              fetchSessions(); // Refresh list
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to approve session");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (requestId: string) => {
    if (!userId) return;
    
    Alert.alert(
      "Reject Session",
      "The user will not be able to login on this device. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(requestId);
            try {
              await dispatch<any>(authApiFetch(
                `/host/users/${userId}/sessions/reject`,
                {
                  method: "POST",
                  body: JSON.stringify({ requestId }),
                }
              ));
              
              Alert.alert("Success", "Session request rejected.");
              fetchSessions(); // Refresh list
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to reject session");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRevoke = async (sessionId: string, deviceLabel?: string) => {
    if (!userId) return;
    
    Alert.alert(
      "Revoke Session",
      `This will log out "${deviceLabel || "this device"}" immediately. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setActionLoading(sessionId);
            try {
              await dispatch<any>(authApiFetch(
                `/host/users/${userId}/sessions/revoke`,
                {
                  method: "POST",
                  body: JSON.stringify({ sessionId }),
                }
              ));
              
              Alert.alert("Success", "Session revoked. User has been logged out.");
              fetchSessions(); // Refresh list
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to revoke session");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getDeviceIcon = (platform?: string | null) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("ios")) return "phone-portrait";
    if (p.includes("android")) return "phone-portrait";
    if (p.includes("web")) return "globe";
    return "hardware-chip";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>User Sessions</Text>
              <Text style={[styles.headerSubtitle, { color: colors.text }]}>{username || userId}</Text>
            </View>
          </View>
          <Pressable onPress={fetchSessions} disabled={loading}>
            <Ionicons name="refresh" size={24} color={loading ? colors.border : colors.text} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading sessions...</Text>
            </View>
          ) : (
            <>
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={20} color={WARNING_ORANGE} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Pending Requests ({pendingRequests.length})
                    </Text>
                  </View>
                  
                  {pendingRequests.map((request) => (
                    <View
                      key={request.id}
                      style={[styles.card, { 
                        backgroundColor: colors.card, 
                        borderColor: WARNING_ORANGE,
                        borderWidth: 2 
                      }]}
                    >
                      <View style={styles.cardHeader}>
                        <Ionicons name={getDeviceIcon(request.platform)} size={24} color={WARNING_ORANGE} />
                        <View style={styles.cardInfo}>
                          <Text style={[styles.deviceName, { color: colors.text }]}>
                            {request.deviceLabel || request.deviceName || "Unknown Device"}
                          </Text>
                          {request.modelName && (
                            <Text style={[styles.deviceDetails, { color: colors.text }]}>
                              {request.modelName}
                            </Text>
                          )}
                          <Text style={[styles.deviceDetails, { color: colors.text }]}>
                            {request.platform || "Unknown"}
                          </Text>
                          <Text style={[styles.timestamp, { color: colors.text }]}>
                            Requested: {formatDate(request.requestedAt)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          style={[styles.actionButton, styles.approveButton]}
                        >
                          {actionLoading === request.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={18} color="#fff" />
                              <Text style={styles.actionButtonText}>Approve</Text>
                            </>
                          )}
                        </Pressable>
                        
                        <Pressable
                          onPress={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          style={[styles.actionButton, styles.rejectButton]}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Active Sessions */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="phone-portrait" size={20} color={SUCCESS_GREEN} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Active Sessions ({sessions.length})
                  </Text>
                </View>
                
                {sessions.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="phone-portrait-outline" size={48} color={colors.text} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>No active sessions</Text>
                  </View>
                ) : (
                  sessions.map((session) => (
                    <View
                      key={session.id}
                      style={[styles.card, { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border 
                      }]}
                    >
                      <View style={styles.cardHeader}>
                        <Ionicons name={getDeviceIcon(session.platform)} size={24} color={SUCCESS_GREEN} />
                        <View style={styles.cardInfo}>
                          <Text style={[styles.deviceName, { color: colors.text }]}>
                            {session.deviceLabel || session.deviceName || "Unknown Device"}
                          </Text>
                          {session.modelName && (
                            <Text style={[styles.deviceDetails, { color: colors.text }]}>
                              {session.modelName}
                            </Text>
                          )}
                          <Text style={[styles.deviceDetails, { color: colors.text }]}>
                            {session.platform || "Unknown"}
                          </Text>
                          <Text style={[styles.timestamp, { color: colors.text }]}>
                            Created: {formatDate(session.createdAt)}
                          </Text>
                          {session.lastSeenAt && (
                            <Text style={[styles.timestamp, { color: colors.text }]}>
                              Last seen: {formatDate(session.lastSeenAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      <Pressable
                        onPress={() => handleRevoke(session.id, session.deviceLabel || session.deviceName || undefined)}
                        disabled={actionLoading === session.id}
                        style={[styles.revokeButton]}
                      >
                        {actionLoading === session.id ? (
                          <ActivityIndicator size="small" color={DANGER_RED} />
                        ) : (
                          <>
                            <Ionicons name="log-out-outline" size={18} color={DANGER_RED} />
                            <Text style={[styles.revokeButtonText, { color: DANGER_RED }]}>Revoke</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              {/* Info */}
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  When "One User, One Device" is enabled, users can only be logged in on one device at a time. 
                  New login attempts require host approval.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppButton label="Close" onPress={onClose} variant="secondary" fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
  },
  deviceDetails: {
    fontSize: 13,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: SUCCESS_GREEN,
  },
  rejectButton: {
    backgroundColor: DANGER_RED,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  revokeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DANGER_RED,
  },
  revokeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
  },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
