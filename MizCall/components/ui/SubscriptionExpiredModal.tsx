import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const DANGER_RED = "#ef4444";
const PRIMARY_BLUE = "#3c82f6";

type SubscriptionExpiredModalProps = {
  visible: boolean;
  membershipType?: string | null;
  onClose: () => void;
};

export function SubscriptionExpiredModal({
  visible,
  membershipType,
  onClose,
}: SubscriptionExpiredModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: DANGER_RED + "20" }]}>
            <Ionicons name="warning" size={48} color={DANGER_RED} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {membershipType === 'Trial' ? 'Trial Expired' : 'Subscription Expired'}
          </Text>

          <Text style={[styles.message, { color: colors.text }]}>
            {membershipType === 'Trial'
              ? 'Your 7-day trial has ended. Upgrade to continue using MizCall.'
              : 'Your subscription has expired. Please renew to continue.'}
          </Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Ionicons name="close-circle" size={20} color={DANGER_RED} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Cannot start new calls
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="close-circle" size={20} color={DANGER_RED} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Cannot manage users
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={PRIMARY_BLUE} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Can view your data
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.closeButton, { backgroundColor: PRIMARY_BLUE }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>
              Got it
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 24,
  },
  features: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
  },
  closeButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
