import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, Dimensions } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRIMARY_BLUE = "#5B9FFF";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
};

export function ActiveCallModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "View Call",
  cancelText = "Cancel",
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable 
          style={[styles.modalContainer, { backgroundColor: colors.card }]} 
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: PRIMARY_BLUE + "20" }]}>
            <Ionicons name="call" size={32} color={PRIMARY_BLUE} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, styles.cancelText, { color: colors.text }]}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.confirmButton, { backgroundColor: PRIMARY_BLUE }]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, styles.confirmText]}>
                {confirmText}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH - 40, 400),
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
  },
  confirmButton: {
    shadowColor: PRIMARY_BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cancelText: {
    opacity: 0.8,
  },
  confirmText: {
    color: "#fff",
  },
});

