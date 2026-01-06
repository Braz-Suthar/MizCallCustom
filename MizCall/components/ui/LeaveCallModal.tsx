import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY_BLUE = "#5B9FFF";
const DANGER_RED = "#ef4444";

type LeaveCallModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isHost?: boolean;
};

export function LeaveCallModal({
  visible,
  onCancel,
  onConfirm,
  isHost = false,
}: LeaveCallModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Warning Icon */}
          <View style={[styles.iconContainer, { backgroundColor: DANGER_RED + "20" }]}>
            <Ionicons name="call" size={48} color={DANGER_RED} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isHost ? "End Call?" : "Leave Call?"}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {isHost 
              ? "Are you sure you want to end the call? All participants will be disconnected."
              : "Are you sure you want to leave the call?"
            }
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.cancelButton, { 
                borderColor: colors.border, 
                backgroundColor: colors.background 
              }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.confirmButton, { backgroundColor: DANGER_RED }]}
              onPress={onConfirm}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>
                {isHost ? "End Call" : "Leave"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

