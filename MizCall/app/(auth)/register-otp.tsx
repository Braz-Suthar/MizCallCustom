import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { registerUser } from "../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../state/store";
import { apiFetch } from "../../state/api";

export default function RegisterOtp() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((s) => s.auth);
  const router = useRouter();

  const email = useMemo(() => (typeof params.email === "string" ? params.email : ""), [params.email]);
  const password = useMemo(() => (typeof params.password === "string" ? params.password : ""), [params.password]);
  const fullName = useMemo(() => (typeof params.fullName === "string" ? params.fullName : ""), [params.fullName]);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const missingData = !email || !password || !fullName;
  const otpValid = otp.trim().length >= 4;

  const handleSubmit = async () => {
    if (missingData) {
      Alert.alert("Missing info", "Please start from the registration form again.");
      router.replace("/(auth)/register");
      return;
    }

    if (!otpValid) {
      Alert.alert("Invalid OTP", "Enter the OTP sent to you.");
      return;
    }

    try {
      setVerifying(true);
      await apiFetch("/auth/otp/verify", "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      await dispatch(registerUser(email.trim(), password.trim())).unwrap?.();
      router.replace("/host/dashboard");
    } catch (e) {
      Alert.alert("Registration failed", e?.message || "Please check your details and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => {
    if (!email) return;
    setResending(true);
    apiFetch("/auth/otp/send", "", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(() => {
        Toast.show({
          type: "info",
          text1: "OTP resent",
          text2: `New OTP sent from mizcallofficial@gmail.com`,
          position: "top",
          visibilityTime: 1800,
          topOffset: 48,
        });
      })
      .catch((e) => {
        Alert.alert("OTP failed", e?.message ?? "Could not resend OTP. Please try again.");
      })
      .finally(() => setResending(false));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Verify OTP</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Enter the OTP sent to {email || "your email"} to complete registration.
          </Text>

          <AppTextInput
            label="OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="Enter OTP"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />

          <AppButton
            label="Create account"
            onPress={handleSubmit}
            disabled={!otpValid || status === "loading" || verifying}
            loading={status === "loading" || verifying}
          />

          <Pressable onPress={handleResend} disabled={resending}>
            <Text style={[styles.resend, { color: colors.text, opacity: resending ? 0.5 : 0.8 }]}>
              {resending ? "Resending..." : "Resend OTP"}
            </Text>
          </Pressable>

          <AppButton label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  resend: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 6,
    opacity: 0.8,
  },
});

