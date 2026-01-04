import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { AppButton } from "./AppButton";

// Consistent primary colors
const PRIMARY_BLUE = "#5B9FFF";
const SUCCESS_GREEN = "#22c55e";

type UserCreatedModalProps = {
  visible: boolean;
  userId: string;
  password: string;
  username: string;
  onClose: () => void;
};

export function UserCreatedModal({
  visible,
  userId,
  password,
  username,
  onClose,
}: UserCreatedModalProps) {
  const { colors } = useTheme();

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: `${label} copied to clipboard`,
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const copyBoth = async () => {
    const text = `User ID: ${userId}\nPassword: ${password}`;
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: 'User ID & Password copied successfully',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Success Icon */}
          <View style={[styles.iconContainer, { backgroundColor: SUCCESS_GREEN + "20" }]}>
            <Ionicons name="checkmark-circle" size={60} color={SUCCESS_GREEN} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>User Created Successfully!</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {username} has been created. Save these credentials:
          </Text>

          {/* Credentials Section */}
          <View style={styles.credentialsContainer}>
            {/* User ID */}
            <View style={[styles.credentialRow, { backgroundColor: colors.background }]}>
              <View style={styles.credentialLeft}>
                <Text style={[styles.credentialLabel, { color: colors.text }]}>User ID</Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>{userId}</Text>
              </View>
              <Pressable 
                style={[styles.copyIconButton, { backgroundColor: PRIMARY_BLUE + "20" }]}
                onPress={() => copyToClipboard(userId, "User ID")}
              >
                <Ionicons name="copy-outline" size={20} color={PRIMARY_BLUE} />
              </Pressable>
            </View>

            {/* Password */}
            <View style={[styles.credentialRow, { backgroundColor: colors.background }]}>
              <View style={styles.credentialLeft}>
                <Text style={[styles.credentialLabel, { color: colors.text }]}>Password</Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>{password}</Text>
              </View>
              <Pressable 
                style={[styles.copyIconButton, { backgroundColor: PRIMARY_BLUE + "20" }]}
                onPress={() => copyToClipboard(password, "Password")}
              >
                <Ionicons name="copy-outline" size={20} color={PRIMARY_BLUE} />
              </Pressable>
            </View>
          </View>

          {/* Copy Both Button */}
          <Pressable 
            style={[styles.copyBothButton, { backgroundColor: PRIMARY_BLUE }]}
            onPress={copyBoth}
          >
            <Ionicons name="copy" size={18} color="#fff" />
            <Text style={styles.copyBothText}>Copy User ID & Password</Text>
          </Pressable>

          {/* Close Button */}
          <AppButton
            label="Done"
            onPress={onClose}
            fullWidth
          />
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
    maxWidth: 450,
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
  credentialsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  credentialLeft: {
    flex: 1,
    gap: 6,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  credentialValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  copyIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBothButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    marginBottom: 16,
  },
  copyBothText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

