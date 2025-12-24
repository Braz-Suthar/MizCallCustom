import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { AppButton } from "../../../components/ui/AppButton";
import { setThemeMode, ThemeMode } from "../../../state/themeSlice";
import { signOut } from "../../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../../state/store";

export default function HostSettings() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const auth = useAppSelector((s) => s.auth);
  const { colors } = useTheme();

  const onThemeChange = (mode: ThemeMode) => dispatch(setThemeMode(mode));
  const onLogout = () => dispatch(signOut());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{(auth.email ?? "Host").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{auth.email ?? "Host"}</Text>
            <Text style={[styles.profileEmail, { color: colors.text }]}>{auth.email ?? "host@example.com"}</Text>
          </View>
          <AppButton label="Edit" variant="secondary" onPress={() => {}} />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.chips}>
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <AppButton
              key={mode}
              label={mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light"}
              variant={themeMode === mode ? "primary" : "secondary"}
              onPress={() => onThemeChange(mode)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <AppButton label="Log out" variant="secondary" onPress={onLogout} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  section: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileEmail: {
    opacity: 0.8,
    marginTop: 2,
  },
});

