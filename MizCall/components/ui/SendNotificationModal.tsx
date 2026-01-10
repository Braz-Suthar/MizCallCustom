import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";
import { authApiFetch } from "../../state/authActions";
import { useAppDispatch } from "../../state/store";

const SUCCESS_GREEN = "#22c55e";

type SendNotificationModalProps = {
  visible: boolean;
  onClose: () => void;
  users?: Array<{ id: string; username: string }>;
};

export function SendNotificationModal({ visible, onClose, users = [] }: SendNotificationModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState<"all_users" | "user">("all_users");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Please enter title and message");
      return;
    }

    if (recipientType === "user" && !selectedUserId) {
      Alert.alert("Error", "Please select a user");
      return;
    }

    setSending(true);
    try {
      const result = await dispatch<any>(authApiFetch<{ ok: boolean; successCount: number; failureCount: number }>(
        "/notifications/send",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            recipientType,
            recipientId: recipientType === "user" ? selectedUserId : undefined,
            data: {},
          }),
        }
      ));

      if (result.ok) {
        Alert.alert(
          "Success",
          `Notification sent!\n✓ ${result.successCount} delivered\n✗ ${result.failureCount} failed`,
          [{ text: "OK", onPress: () => {
            setTitle("");
            setBody("");
            setRecipientType("all_users");
            setSelectedUserId(null);
            onClose();
          }}]
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Send Notification</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Recipient Type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Send to</Text>
            <View style={styles.recipientButtons}>
              <Pressable
                style={[
                  styles.recipientButton,
                  { borderColor: colors.border },
                  recipientType === "all_users" && [styles.recipientButtonActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setRecipientType("all_users")}
              >
                <Text style={[
                  styles.recipientButtonText,
                  { color: colors.text },
                  recipientType === "all_users" && styles.recipientButtonTextActive
                ]}>
                  All Users
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.recipientButton,
                  { borderColor: colors.border },
                  recipientType === "user" && [styles.recipientButtonActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setRecipientType("user")}
              >
                <Text style={[
                  styles.recipientButtonText,
                  { color: colors.text },
                  recipientType === "user" && styles.recipientButtonTextActive
                ]}>
                  Specific User
                </Text>
              </Pressable>
            </View>
          </View>

          {/* User Selection (if specific user) */}
          {recipientType === "user" && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>Select User</Text>
              <View style={[styles.userList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {users.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.text }]}>No users available</Text>
                ) : (
                  users.map((user) => (
                    <Pressable
                      key={user.id}
                      style={[
                        styles.userItem,
                        { borderBottomColor: colors.border },
                        selectedUserId === user.id && { backgroundColor: colors.primary + "20" }
                      ]}
                      onPress={() => setSelectedUserId(user.id)}
                    >
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{user.username}</Text>
                        <Text style={[styles.userId, { color: colors.text }]}>{user.id}</Text>
                      </View>
                      {selectedUserId === user.id && (
                        <Ionicons name="checkmark-circle" size={24} color={SUCCESS_GREEN} />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          )}

          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Notification title"
              placeholderTextColor={colors.text + "80"}
              maxLength={50}
            />
          </View>

          {/* Body */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Message</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={body}
              onChangeText={setBody}
              placeholder="Notification message"
              placeholderTextColor={colors.text + "80"}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.text }]}>{body.length}/200</Text>
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Preview</Text>
            <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.previewHeader}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
                <Text style={[styles.previewTitle, { color: colors.text }]}>
                  {title || "Notification Title"}
                </Text>
              </View>
              <Text style={[styles.previewBody, { color: colors.text }]}>
                {body || "Notification message will appear here..."}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppButton label="Cancel" onPress={onClose} variant="secondary" fullWidth style={{ flex: 1 }} />
          <AppButton 
            label={sending ? "Sending..." : "Send Notification"} 
            onPress={handleSend} 
            loading={sending}
            disabled={sending || !title.trim() || !body.trim()}
            fullWidth 
            style={{ flex: 1 }}
          />
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  recipientButtons: {
    flexDirection: "row",
    gap: 12,
  },
  recipientButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  recipientButtonActive: {
    borderWidth: 0,
  },
  recipientButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  recipientButtonTextActive: {
    color: "#fff",
  },
  userList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 200,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  userId: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyText: {
    padding: 16,
    textAlign: "center",
    opacity: 0.5,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "right",
    marginTop: 4,
  },
  preview: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
});
