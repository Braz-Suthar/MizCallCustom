import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { registerUser } from "../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../state/store";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((s) => s.auth);
  const router = useRouter();

  const formValid =
    fullName.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.trim().length >= 6 &&
    confirmPassword === password;

  const onSubmit = async () => {
    if (!formValid) {
      Alert.alert("Missing info", "Please complete all fields and ensure passwords match.");
      return;
    }

    // Navigate to OTP screen with the entered details
    router.push({
      pathname: "/(auth)/register-otp",
      params: {
        fullName: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
      },
    });
  };
  const disable = status === "loading" || !formValid;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>Hosts register with email and password.</Text>

          <AppTextInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />
          <AppTextInput
            label="Email"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />
          <AppTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 6 characters"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />
          <AppTextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter password"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />

          <AppButton
            label="Send OTP"
            onPress={onSubmit}
            disabled={disable}
            loading={status === "loading"}
          />

          <Text style={[styles.terms, { color: colors.text }]}>
            By creating an account you agree to our Terms & Conditions and Privacy Policy.
          </Text>

          <Text style={[styles.helper, { color: colors.text }]}>Already have an account?</Text>
          <AppButton label="Back to login" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f7f8fb",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#5c5c61",
  },
  helper: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
    lineHeight: 18,
  },
});

