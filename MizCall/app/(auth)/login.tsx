import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import * as Device from "expo-device";

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
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sessionPending, setSessionPending] = useState<{ userId: string; password: string; message: string; existingDevice?: string; existingPlatform?: string } | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((s) => s.auth);
  const router = useRouter();

  const onSubmit = async () => {
    setErrorText(null);
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
        // Gather device info
        const deviceInfo = {
          deviceName: Device.deviceName || undefined,
          deviceModel: Device.modelName || undefined,
          platform: Platform.OS || undefined,
          osName: Device.osName || undefined,
          osVersion: Device.osVersion || undefined,
        };
        
        const res: any = await dispatch(loginUser(userId.trim(), password, deviceInfo));
        if (res?.pending) {
          // Session approval pending
          setSessionPending({
            userId: userId.trim(),
            password,
            message: res.message || "Waiting for host approval",
            existingDevice: res.existingDevice,
            existingPlatform: res.existingPlatform,
          });
          // Start polling for approval
          startPollingForApproval(userId.trim(), password);
          return;
        }
        if (res?.ok) {
          // Check if old sessions were revoked
          if (res.revokedSessions && res.revokedSessions > 0) {
            Toast.show({
              type: "info",
              text1: "Logged In",
              text2: `You were logged out from ${res.revokedSessions} other device(s)`,
              position: "top",
              visibilityTime: 3000,
              topOffset: 48,
            });
          }
          router.replace("/user/dashboard");
        }
      }
    } catch (e: any) {
      const msg = e?.message || "Login failed";
      const friendly =
        msg.includes("already signed in") || msg.includes("SESSION_ACTIVE")
          ? "You're already signed in on another device. Log out there or enable concurrent sessions."
          : msg;
      setErrorText(friendly);
      Alert.alert("Login failed", friendly);
    }
  };

  const startPollingForApproval = (uid: string, pwd: string) => {
    // Poll every 3 seconds to check if approved
    const pollInterval = setInterval(async () => {
      try {
        setCheckingApproval(true);
        const res: any = await dispatch(loginUser(uid, pwd));
        if (res?.ok && !res?.pending) {
          // Approved! Login successful
          clearInterval(pollInterval);
          setSessionPending(null);
          setCheckingApproval(false);
          
          let message = "Your session has been approved!";
          if (res.revokedSessions && res.revokedSessions > 0) {
            message += ` You were logged out from ${res.revokedSessions} other device(s).`;
          }
          
          Toast.show({
            type: "success",
            text1: "Approved",
            text2: message,
            position: "top",
            visibilityTime: 3000,
            topOffset: 48,
          });
          router.replace("/user/dashboard");
        } else if (!res?.pending) {
          // Rejected or error
          clearInterval(pollInterval);
          setSessionPending(null);
          setCheckingApproval(false);
          setErrorText("Session request was rejected or expired");
          Alert.alert("Access Denied", "Your session request was rejected by the host");
        }
      } catch (e) {
        // Still pending or error - keep polling
        console.log("[login] Polling check:", e);
      } finally {
        setCheckingApproval(false);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (sessionPending) {
        setSessionPending(null);
        setErrorText("Session approval timeout. Please try again.");
      }
    }, 300000);
  };

  const onVerifyOtp = async () => {
    if (!otpPending) return;
    if (!otp.trim()) {
      setOtpError("Enter the code");
      return;
    }
    setOtpError(null);
    setErrorText(null);
    try {
      await dispatch(verifyHostOtp(otpPending.hostId, otp.trim(), otpPending.password));
      setOtpPending(null);
      setOtp("");
      router.replace("/host/dashboard");
    } catch (e: any) {
      const msg = e?.message || "Verification failed";
      const friendly =
        msg.includes("already signed in") || msg.includes("SESSION_ACTIVE")
          ? "You're already signed in on another device. Log out there or enable concurrent sessions."
          : msg;
      setOtpError(friendly);
      setErrorText(friendly);
    }
  };

  const disable = status === "loading" || (!password.trim()) || (mode === "host" ? !email.trim() : !userId.trim());

  // Session approval pending screen
  if (sessionPending) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pendingHeader}>
              {checkingApproval ? (
                <View style={styles.spinner} />
              ) : (
                <View style={[styles.pendingIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={styles.pendingIconText}>⏳</Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>Approval Pending</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {sessionPending.message}
            </Text>

            {sessionPending.existingDevice && (
              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Currently Active Device:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {sessionPending.existingDevice}
                </Text>
                {sessionPending.existingPlatform && (
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    Platform: {sessionPending.existingPlatform}
                  </Text>
                )}
              </View>
            )}

            <View style={[styles.statusBox, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b" }]}>
              <Text style={[styles.statusText, { color: "#f59e0b" }]}>
                {checkingApproval ? "Checking approval status..." : "Waiting for host approval..."}
              </Text>
            </View>

            <Text style={[styles.helperText, { color: colors.text }]}>
              Your login request has been sent to the host. You'll be automatically logged in once approved.
            </Text>

            <AppButton 
              label="Cancel" 
              variant="secondary" 
              onPress={() => { 
                setSessionPending(null); 
                setErrorText(null);
              }} 
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            {errorText && !otpError ? <Text style={[styles.error, { color: colors.notification }]}>{errorText}</Text> : null}
            <AppButton label="Verify" onPress={onVerifyOtp} disabled={!otp.trim() || status === "loading"} loading={status === "loading"} />
            <AppButton label="Back" variant="ghost" onPress={() => { setOtpPending(null); setOtp(""); setOtpError(null); setErrorText(null); }} />
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
          {errorText ? <Text style={[styles.error, { color: colors.notification, textAlign: "center" }]}>{errorText}</Text> : null}

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
    textAlign: "center",
  },
  pendingHeader: {
    alignItems: "center",
    marginVertical: 16,
  },
  pendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingIconText: {
    fontSize: 40,
  },
  spinner: {
    width: 80,
    height: 80,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 18,
  },
});

