import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { loginHost, loginUser, verifyHostOtp } from "../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../state/store";

type Mode = "host" | "user";


export default function Login() {
  const [mode, setMode] = useState<Mode>("host");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPending, setOtpPending] = useState<{ hostId: string; email: string; password: string } | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((s) => s.auth);
  const router = useRouter();

  const onSubmit = async () => {
    try {
      if (mode === "host") {
        const res: any = await dispatch(loginHost(email.trim(), password));
        if (res?.requireOtp) {
          setOtpPending({ hostId: res.hostId, email: res.email, password });
          setOtp("");
          setOtpError(null);
          return;
        }
        router.replace("/host/dashboard");
      } else {
        await dispatch(loginUser(userId.trim(), password));
        router.replace("/user/dashboard");
      }
    } catch (e) {
      Alert.alert("Login failed", "Please check your credentials and try again.");
    }
  };

  const onVerifyOtp = async () => {
    if (!otpPending) return;
    if (!otp.trim()) {
      setOtpError("Enter the code");
      return;
    }
    setOtpError(null);
    try {
      await dispatch(verifyHostOtp(otpPending.hostId, otp.trim(), otpPending.password));
      setOtpPending(null);
      setOtp("");
      router.replace("/host/dashboard");
    } catch (e: any) {
      setOtpError(e?.message || "Verification failed");
    }
  };

  const disable = status === "loading" || (!password.trim()) || (mode === "host" ? !email.trim() : !userId.trim());

  if (otpPending) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Enter login code</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>We sent a 6-digit code to {otpPending.email}</Text>
            <AppTextInput
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="123456"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                shadowOpacity: 0,
                elevation: 0,
              }}
            />
            {otpError ? <Text style={[styles.error, { color: colors.notification }]}>{otpError}</Text> : null}
            <AppButton label="Verify" onPress={onVerifyOtp} disabled={!otp.trim() || status === "loading"} loading={status === "loading"} />
            <AppButton label="Back" variant="ghost" onPress={() => { setOtpPending(null); setOtp(""); }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>Choose your role to continue</Text>

          <SegmentedControl
            options={[
              { label: "Host", value: "host" },
              { label: "User", value: "user" },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === "host" ? (
            <AppTextInput
              label="Email"
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="host@example.com"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                shadowOpacity: 0,
                elevation: 0,
              }}
            />
          ) : (
            <AppTextInput
              label="User ID"
              value={userId}
              autoCapitalize="characters"
              onChangeText={setUserId}
              placeholder="U123456"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                shadowOpacity: 0,
                elevation: 0,
              }}
            />
          )}
          <AppTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowOpacity: 0,
              elevation: 0,
            }}
          />

          <AppButton label="Continue" onPress={onSubmit} disabled={disable} loading={status === "loading"} />

        <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
          <Text style={[styles.forgot, { color: colors.text }]}>Forgot Password?</Text>
        </Pressable>

          <Text style={[styles.helper, { color: colors.text }]}>Need an account? Register to get started.</Text>
          <AppButton
            label="Create account"
            variant="ghost"
            onPress={() => router.push("/(auth)/register")}
          />
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
  helper: {
    textAlign: "center",
    fontSize: 13,
  },
  forgot: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    marginTop: 4,
  },
});

