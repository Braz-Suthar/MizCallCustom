import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { UserCreatedModal } from "../../components/ui/UserCreatedModal";
import { apiFetch } from "../../state/api";
import { useAppSelector } from "../../state/store";

export default function CreateUser() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token, role } = useAppSelector((s) => s.auth);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [enforceSingleDevice, setEnforceSingleDevice] = useState<boolean | null>(null); // null = inherit from host
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ userId: string; password: string; username: string } | null>(null);

  const valid =
    name.trim().length >= 2 &&
    password.trim().length >= 1 &&
    !/^\s+$/.test(password) &&
    !/\s/.test(password);

  const onSubmit = async () => {
    if (!valid) {
      Alert.alert("Missing info", "Please provide a name and a password (no spaces).");
      return;
    }

    if (!token || role !== "host") {
      Alert.alert("Not signed in", "Please log in as host again.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiFetch<{ userId: string; password: string }>(
        "/host/users",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            username: name.trim(),
            password: password.trim(),
            enforceSingleDevice,
          }),
        },
      );
      
      // Show success modal with credentials
      setCreatedUser({
        userId: result.userId,
        password: result.password,
        username: name.trim(),
      });
      setShowSuccessModal(true);
      
      // Clear form
      setName("");
      setPassword("");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedUser(null);
    router.back();
  };

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Create new user</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Provide details to create a new regular user.</Text>

        <AppTextInput
          label="User name"
          value={name}
          onChangeText={setName}
          placeholder="John Doe"
        />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password (no spaces)"
        />

        {/* One Device Only Setting */}
        <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingHeader}>
            <Ionicons name="phone-portrait" size={20} color={colors.primary} />
            <Text style={[styles.settingTitle, { color: colors.text }]}>One Device Only</Text>
          </View>
          <Text style={[styles.settingDescription, { color: colors.text }]}>
            Restrict this user to one device at a time. New device logins require host approval.
          </Text>
          
          <View style={styles.toggleGroup}>
            <Pressable
              style={[
                styles.toggleOption,
                { borderColor: colors.border },
                enforceSingleDevice === null && [styles.toggleOptionActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setEnforceSingleDevice(null)}
            >
              <Text style={[
                styles.toggleOptionText,
                { color: colors.text },
                enforceSingleDevice === null && styles.toggleOptionTextActive
              ]}>
                Inherit from Host
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.toggleOption,
                { borderColor: colors.border },
                enforceSingleDevice === true && [styles.toggleOptionActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setEnforceSingleDevice(true)}
            >
              <Text style={[
                styles.toggleOptionText,
                { color: colors.text },
                enforceSingleDevice === true && styles.toggleOptionTextActive
              ]}>
                Force Single Device
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.toggleOption,
                { borderColor: colors.border },
                enforceSingleDevice === false && [styles.toggleOptionActive, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setEnforceSingleDevice(false)}
            >
              <Text style={[
                styles.toggleOptionText,
                { color: colors.text },
                enforceSingleDevice === false && styles.toggleOptionTextActive
              ]}>
                Allow Multiple
              </Text>
            </Pressable>
          </View>
        </View>

        <AppButton label="Create user" onPress={onSubmit} disabled={!valid || loading} loading={loading} fullWidth />
        <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Success Modal */}
      {createdUser && (
        <UserCreatedModal
          visible={showSuccessModal}
          userId={createdUser.userId}
          password={createdUser.password}
          username={createdUser.username}
          onClose={handleCloseSuccessModal}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.8,
  },
  settingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  toggleGroup: {
    flexDirection: "row",
    gap: 8,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOptionActive: {
    borderWidth: 0,
  },
  toggleOptionText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  toggleOptionTextActive: {
    color: "#fff",
  },
});

