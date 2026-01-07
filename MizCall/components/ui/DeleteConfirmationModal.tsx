import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";

const DANGER_RED = "#ef4444";

/**
 * DeleteConfirmationModal - A custom delete confirmation dialog for iOS and Android
 * 
 * Usage Example:
 * 
 * ```tsx
 * import { DeleteConfirmationModal } from "../../../components/ui/DeleteConfirmationModal";
 * 
 * const [deleteModalVisible, setDeleteModalVisible] = useState(false);
 * const [selectedItem, setSelectedItem] = useState(null);
 * const [deleting, setDeleting] = useState(false);
 * 
 * const handleDelete = (item) => {
 *   setSelectedItem(item);
 *   setDeleteModalVisible(true);
 * };
 * 
 * const confirmDelete = async () => {
 *   setDeleting(true);
 *   try {
 *     await deleteItem(selectedItem.id);
 *     setDeleteModalVisible(false);
 *   } catch (e) {
 *     // Handle error
 *   } finally {
 *     setDeleting(false);
 *   }
 * };
 * 
 * return (
 *   <>
 *     <Button onPress={() => handleDelete(item)} />
 *     
 *     <DeleteConfirmationModal
 *       visible={deleteModalVisible}
 *       title="Delete Item"
 *       message="Are you sure you want to delete this item?"
 *       itemName={selectedItem?.name}
 *       onConfirm={confirmDelete}
 *       onCancel={() => setDeleteModalVisible(false)}
 *       loading={deleting}
 *     />
 *   </>
 * );
 * ```
 */

type DeleteConfirmationModalProps = {
  visible: boolean;
  title?: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function DeleteConfirmationModal({
  visible,
  title = "Delete Confirmation",
  message,
  itemName,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmationModalProps) {
  const { colors } = useTheme();
  const closeBorder = colors.border ?? "rgba(255,255,255,0.35)";
  const isDarkBg = (() => {
    const bg = colors.background ?? "#000";
    const hex = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 140;
    }
    return false;
  })();
  const closeButtonBg = isDarkBg ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";
  const secondaryButtonBg = isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const secondaryButtonBorder = colors.border ?? (isDarkBg ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onCancel}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            style={[styles.closeButton, { borderColor: closeBorder, backgroundColor: closeButtonBg }]}
            onPress={onCancel}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          {/* Warning Icon */}
          <View style={[styles.iconContainer, { backgroundColor: DANGER_RED + "20" }]}>
            <Ionicons name="warning" size={40} color={DANGER_RED} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>

          {/* Item Name (if provided) */}
          {itemName && (
            <View style={[styles.itemNameContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.itemName, { color: colors.text }]}>
                "{itemName}"
              </Text>
            </View>
          )}

          {/* Warning Text */}
          <Text style={[styles.warningText, { color: DANGER_RED }]}>
            This action cannot be undone.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <AppButton
                label={cancelText}
                onPress={onCancel}
                variant="secondary"
                fullWidth
                disabled={loading}
                style={{ backgroundColor: secondaryButtonBg, borderColor: secondaryButtonBorder, borderWidth: 1 }}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <AppButton
                label={confirmText}
                onPress={onConfirm}
                variant="danger"
                fullWidth
                loading={loading}
                disabled={loading}
              />
            </View>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 16,
  },
  itemNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  warningText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonWrapper: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
});

