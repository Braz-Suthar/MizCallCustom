import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { authApiFetch } from "../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../state/store";
import { setCredentials } from "../../state/authSlice";
import { saveSession } from "../../state/sessionStorage";

const SUCCESS_GREEN = "#22c55e";
const DANGER_RED = "#ef4444";

type TwoFactorMethod = "email" | "mobile" | null;

export default function TwoFactorSettings() {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const PRIMARY_BLUE = colors.primary;

  const isDarkBg = (() => {
    const bg = colors.background ?? "#000";
    const hexMatch = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1].length === 3 ? hexMatch[1].split("").map((c) => c + c).join("") : hexMatch[1];
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 140;
    }
    return false;
  })();

  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTwoFactorSettings();
  }, []);

  const loadTwoFactorSettings = async () => {
    setLoading(true);
    try {
      const res = await dispatch<any>(authApiFetch<{
        emailOtpEnabled: boolean;
      }>("/host/two-factor-settings"));
      
      setEmailOtpEnabled(res.emailOtpEnabled || false);
    } catch (e: any) {
      console.error("Failed to load 2FA settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmailOtp = async () => {
    const next = !emailOtpEnabled;
    setEmailOtpEnabled(next);
    try {
      await dispatch<any>(authApiFetch("/host/two-factor-settings/email", {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      }));
      
      Toast.show({
        type: "success",
        text1: next ? "Email OTP Enabled" : "Email OTP Disabled",
        text2: next ? "You'll receive OTP via email during login" : "Email OTP has been disabled",
        position: "top",
        visibilityTime: 3000,
        topOffset: 48,
      });

      // Update auth state
      const updated = {
        ...auth,
        twoFactorEnabled: next,
        token: auth.token,
        role: auth.role ?? "host",
      };
      dispatch(setCredentials(updated as any));
      await saveSession(updated as any);
    } catch (e: any) {
      setEmailOtpEnabled(!next);
      Alert.alert("Error", e?.message || "Failed to update Email OTP setting");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Ionicons name="shield-checkmark" size={48} color={PRIMARY_BLUE} />
          <Text style={[styles.introTitle, { color: colors.text }]}>Secure Your Account</Text>
          <Text style={[styles.introText, { color: colors.text }]}>
            Enable two-factor authentication to add an extra layer of security to your account. 
            Choose one or both methods below.
          </Text>
        </View>

        {/* Email OTP Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.methodHeader}>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <Ionicons name="mail" size={24} color={PRIMARY_BLUE} />
                <Text style={[styles.methodTitle, { color: colors.text }]}>Email OTP</Text>
              </View>
              <Text style={[styles.methodDescription, { color: colors.text }]}>
                Receive verification codes via email during login
              </Text>
              {auth.email && (
                <View style={[styles.detailBadge, { backgroundColor: PRIMARY_BLUE + "15" }]}>
                  <Ionicons name="checkmark-circle" size={16} color={PRIMARY_BLUE} />
                  <Text style={[styles.detailText, { color: PRIMARY_BLUE }]}>
                    {auth.email}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: emailOtpEnabled }}
              onPress={handleToggleEmailOtp}
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: emailOtpEnabled
                    ? PRIMARY_BLUE + "55"
                    : isDarkBg
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(0,0,0,0.06)",
                  borderColor: emailOtpEnabled
                    ? colors.border ?? "transparent"
                    : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: emailOtpEnabled ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                    transform: [{ translateX: emailOtpEnabled ? 20 : 0 }],
                    shadowColor: "#000",
                  },
                ]}
              />
            </Pressable>
          </View>
        </View>

        {/* Mobile OTP Section - Disabled */}
        <View style={[styles.section, styles.disabledSection, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}>
          <View style={styles.methodHeader}>
            <View style={styles.methodInfo}>
              <View style={styles.methodTitleRow}>
                <Ionicons name="phone-portrait" size={24} color={colors.text} style={{ opacity: 0.5 }} />
                <Text style={[styles.methodTitle, { color: colors.text }]}>Mobile OTP</Text>
                <View style={[styles.comingSoonBadge, { backgroundColor: "#64748b" }]}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={[styles.methodDescription, { color: colors.text }]}>
                Receive verification codes via SMS during login
              </Text>
              <View style={[styles.warningBadge, { backgroundColor: "#64748b15" }]}>
                <Ionicons name="time" size={16} color="#64748b" />
                <Text style={[styles.warningText, { color: "#64748b" }]}>
                  SMS verification will be available soon
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: isDarkBg ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.06)",
                  borderColor: colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
                  opacity: 0.4,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: colors.card ?? "#f9fafb",
                    transform: [{ translateX: 0 }],
                    shadowColor: "#000",
                  },
                ]}
              />
            </View>
          </View>
        </View>


        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: PRIMARY_BLUE + "10", borderColor: PRIMARY_BLUE + "30" }]}>
          <Ionicons name="information-circle" size={24} color={PRIMARY_BLUE} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              When you sign in, you'll enter your password and then receive a one-time code via your 
              selected method(s). This ensures only you can access your account.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  intro: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  introText: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  methodInfo: {
    flex: 1,
    gap: 10,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  methodTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  methodDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "600",
  },
  changePhoneButton: {
    marginTop: 8,
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  inputSection: {
    gap: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
  changePhoneStep: {
    gap: 12,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepDescription: {
    fontSize: 13,
    opacity: 0.7,
  },
  infoSection: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  infoContent: {
    flex: 1,
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 19,
  },
  disabledSection: {
    pointerEvents: "none",
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  comingSoonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
