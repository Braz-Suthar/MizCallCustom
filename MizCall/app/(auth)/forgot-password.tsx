import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");

  const isRequestValid = email.trim().length > 0;
  const isOtpValid = otp.trim().length >= 4;

  const handleSubmit = async () => {
    if (step === "request") {
      if (!isRequestValid) {
        Alert.alert("Missing email", "Please enter your email to receive an OTP.");
        return;
      }
      // TODO: call backend to send OTP
      setStep("verify");
      return;
    }

    if (!isOtpValid) {
      Alert.alert("Invalid OTP", "Enter the OTP sent to your email.");
      return;
    }

    // TODO: verify OTP and navigate to reset password screen
    Alert.alert("Success", "OTP verified. Please set your new password.");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Enter your email to receive an OTP and reset your password.
          </Text>

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

          {step === "verify" && (
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

          <AppButton
            label={step === "request" ? "Send OTP" : "Verify OTP"}
            onPress={handleSubmit}
            disabled={step === "request" ? !isRequestValid : !isOtpValid}
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

