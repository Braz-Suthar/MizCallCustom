import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { API_BASE } from "../../state/api";

type EditProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  avatarUrl?: string | null;
  token: string | null;
  onAvatarUpdated?: (url: string) => Promise<void> | void;
  onSave: (name: string, email: string) => Promise<void>;
};

export function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentEmail,
  avatarUrl,
  token,
  onAvatarUpdated,
  onSave,
}: EditProfileModalProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary ?? "#3c82f6";
  const primaryTint = primaryColor.startsWith("#") ? `${primaryColor}20` : primaryColor;
  const primaryDim = primaryColor.startsWith("#") ? `${primaryColor}80` : primaryColor;
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
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setName(currentName);
    setEmail(currentEmail);
  }, [currentName, currentEmail, visible]);

  const handleSave = async () => {
    setError(null);
    
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await onSave(name.trim(), email.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!token) {
      Toast.show({ type: "error", text1: "Not authenticated" });
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: "error", text1: "Permission denied", text2: "Please allow photos access" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Toast.show({ type: "error", text1: "No image selected" });
      return;
    }

    try {
      setUploadingAvatar(true);
      const form = new FormData();
      form.append("avatar", {
        uri: asset.uri,
        name: asset.fileName || "avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      } as any);

      const res = await fetch(`${API_BASE}/host/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Upload failed");
      }
      const data = await res.json();
      const fullUrl = data.avatarUrl?.startsWith("http")
        ? data.avatarUrl
        : `${API_BASE}${data.avatarUrl}`;

      if (onAvatarUpdated) await onAvatarUpdated(fullUrl);
      Toast.show({ type: "success", text1: "Profile photo updated" });
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Upload failed", text2: e?.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName(currentName);
      setEmail(currentEmail);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <Pressable
            style={[styles.closeButton, { borderColor: closeBorder, backgroundColor: closeButtonBg }]}
            onPress={handleClose}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: primaryTint }]}>
                <Ionicons name="person" size={28} color={primaryColor} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Edit Profile
              </Text>
              <Text style={[styles.subtitle, { color: colors.text }]}>
                Update your personal information
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: "#ef444420", borderColor: "#ef4444" }]}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.avatarBlock}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: primaryColor }]}>
                  <Text style={styles.avatarFallbackText}>{(name || "H").charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Pressable
                style={[styles.changePhotoButton, { borderColor: secondaryButtonBorder, backgroundColor: secondaryButtonBg }]}
                onPress={handleChangePhoto}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={primaryColor} />
                ) : (
                  <Ionicons name="image-outline" size={18} color={primaryColor} />
                )}
                <Text style={[styles.changePhotoText, { color: primaryColor }]}>
                  {uploadingAvatar ? "Uploading..." : "Change Photo"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.formContainer}>
              {/* Name Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Name
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={20} color={colors.text} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.text + "60"}
                    editable={!loading}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Email
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.text} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.text + "60"}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={[
                  styles.cancelButton,
                  { borderColor: secondaryButtonBorder, backgroundColor: secondaryButtonBg },
                ]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: loading ? primaryDim : primaryColor, shadowColor: primaryColor },
                ]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.saveButtonText}>
                  {loading ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>

            {loading && (
              <View style={styles.loadingOverlay}>
                <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
                  <ActivityIndicator size="large" color={primaryColor} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>
                    Updating profile...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 450,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    maxHeight: "85%",
    position: "relative",
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#ef4444",
    fontSize: 13,
  },
  formContainer: {
    gap: 18,
    marginBottom: 20,
  },
  avatarBlock: {
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e5e7eb",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: "600",
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
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

