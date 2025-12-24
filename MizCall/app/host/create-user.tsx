import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { apiFetch } from "../../state/api";
import { useAppSelector } from "../../state/store";

export default function CreateUser() {
  const { colors } = useTheme();
  const router = useRouter();
  const { token, role } = useAppSelector((s) => s.auth);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = name.trim().length >= 2 && password.trim().length >= 6;

  const onSubmit = async () => {
    if (!valid) {
      Alert.alert("Missing info", "Please provide a name and a 6+ character password.");
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
          }),
        },
      );
      Alert.alert("User created", `ID: ${result.userId}\nPassword: ${result.password}`);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          placeholder="Minimum 6 characters"
        />

        <AppButton label="Create user" onPress={onSubmit} disabled={!valid || loading} loading={loading} fullWidth />
        <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
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
});

