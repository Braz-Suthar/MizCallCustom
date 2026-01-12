import React, { useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { AppButton } from "../../../components/ui/AppButton";
import { setThemeMode, ThemeMode } from "../../../state/themeSlice";
import { signOut } from "../../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { setCallBackground, setAvatarUrl } from "../../../state/authSlice";
import { saveSession } from "../../../state/sessionStorage";
import { API_BASE } from "../../../state/api";

export default function UserSettings() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const { colors, dark } = useTheme();
  const auth = useAppSelector((s) => s.auth);
  const { userId, displayName, password, avatarUrl, callBackground } = auth;

  const [selectedBg, setSelectedBg] = useState<string | null>(callBackground);
  const backgrounds = useMemo(
    () => [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=60",
      "https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=60",
    ],
    [],
  );

  const onThemeChange = (mode: ThemeMode) => dispatch(setThemeMode(mode));
  const onLogout = () => dispatch(signOut());
  const onCopy = (value: string, label: string) =>
    Clipboard.setStringAsync(value).then(() =>
      Toast.show({
        type: "success",
        text1: `${label} copied`,
        position: "bottom",
        visibilityTime: 1500,
      }),
    );
  const onChangeAvatar = async () => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      Alert.alert("Unsupported", "Profile pictures are currently mobile-only.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to pick a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    dispatch(setAvatarUrl(uri));
    if (auth.role) {
      await saveSession({
        userId: auth.userId ?? undefined,
        hostId: auth.hostId ?? undefined,
        email: auth.email ?? undefined,
        displayName: auth.displayName ?? undefined,
        password: auth.password ?? undefined,
        avatarUrl: uri,
        callBackground: auth.callBackground ?? undefined,
        token: auth.token ?? "",
        role: auth.role,
      });
    }
  };
  const onBackgroundSelect = (url: string) => {
    setSelectedBg(url);
    dispatch(setCallBackground(url));
  };
  const onUploadBackground = () =>
    Alert.alert("Upload background", "Wire this button to your image picker or file picker.");

  const avatarFallback = useMemo(() => {
    const seed = userId ?? "user";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=007aff&color=fff`;
  }, [userId]);

  const fullAvatarUrl = useMemo(() => {
    if (!avatarUrl) return avatarFallback;
    if (avatarUrl.startsWith('http') || avatarUrl.startsWith('file://')) return avatarUrl;
    return `${API_BASE}${avatarUrl}`;
  }, [avatarUrl, avatarFallback]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, position: "relative" }}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View>
              <Image source={{ uri: fullAvatarUrl }} style={styles.avatar} />
              <Pressable style={[styles.avatarEdit, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onChangeAvatar}>
                <Ionicons name="camera" size={16} color={colors.text} />
              </Pressable>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName ?? "Unnamed user"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>User ID</Text>
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {userId ?? "Not set"}
              </Text>
            </View>
            {userId ? (
              <Pressable style={styles.iconButton} onPress={() => onCopy(userId, "User ID")}>
                <Ionicons name="copy-outline" size={18} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Name (from host)</Text>
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {displayName ?? "Not provided"}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Password (read-only)</Text>
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {password ?? "Not stored"}
              </Text>
            </View>
            {password ? (
              <Pressable style={styles.iconButton} onPress={() => onCopy(password, "Password")}>
                <Ionicons name="copy-outline" size={18} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={styles.chips}>
            {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
              <AppButton
                key={mode}
                label={mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light"}
                size="sm"
                variant={themeMode === mode ? "primary" : "secondary"}
                onPress={() => onThemeChange(mode)}
              />
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Call background</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgRow}>
            {backgrounds.map((bg) => {
              const active = selectedBg === bg;
              return (
                <Pressable key={bg} onPress={() => onBackgroundSelect(bg)} style={[styles.bgThumbWrapper, active && { borderColor: colors.primary, borderWidth: 2 }]}>
                  <Image source={{ uri: bg }} style={styles.bgThumb} />
                </Pressable>
              );
            })}
          </ScrollView>
          <AppButton label="Upload custom background" variant="secondary" size="sm" onPress={onUploadBackground} />
        </View>

        <View style={[styles.section, styles.securitySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
          <AppButton label="Log out" variant="danger" onPress={onLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  section: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  securitySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  avatarEdit: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  caption: {
    fontSize: 13,
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 13,
    opacity: 0.8,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bgRow: {
    gap: 10,
  },
  bgThumbWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bgThumb: {
    width: 120,
    height: 70,
  },
});

