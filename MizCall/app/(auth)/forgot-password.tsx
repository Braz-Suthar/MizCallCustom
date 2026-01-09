import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { useAppDispatch } from "../../state/store";
import { requestHostPasswordOtp, resetHostPassword } from "../../state/authActions";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [hostId, setHostId] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const isRequestValid = identifier.trim().length > 0;
  const isOtpValid = otp.trim().length >= 4 && newPassword.trim().length >= 6 && newPassword === confirm;

  const handleSubmit = async () => {
    if (step === "request") {
      if (!isRequestValid) {
        Alert.alert("Missing email or Host ID", "Please enter your host email or Host ID to receive an OTP.");
        return;
      }
      try {
        setLoading(true);
        const res: any = await dispatch(requestHostPasswordOtp(identifier));
        setHostId(res?.hostId ?? "");
        setEmail(res?.email ?? identifier);
        setStep("reset");
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to send OTP.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isOtpValid) {
      Alert.alert("Invalid OTP", "Enter the OTP and a new password (min 6 chars).");
      return;
    }

    try {
      setLoading(true);
      await dispatch(resetHostPassword({ hostId: hostId || identifier, otp: otp.trim(), newPassword }));
      Alert.alert("Success", "Password reset. Please log in with your new password.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Hosts only. Enter your email or Host ID to receive an OTP and reset your password.
          </Text>

          <AppTextInput
            label="Email or Host ID"
            value={identifier}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setIdentifier}
            placeholder="you@example.com or H123456"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />

          {step === "reset" && (
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
          )}

          {step === "reset" && (
            <>
              <AppTextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
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
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="Re-enter password"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  shadowOpacity: 0,
                  elevation: 0,
                }}
              />
            </>
          )}

          <AppButton
            label={step === "request" ? "Send OTP" : "Reset Password"}
            onPress={handleSubmit}
            disabled={step === "request" ? !isRequestValid : !isOtpValid}
            loading={loading}
          />

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
});

