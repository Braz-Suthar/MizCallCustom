import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppButton } from "../../../components/ui/AppButton";
import { EditProfileModal } from "../../../components/ui/EditProfileModal";
import { ChangePasswordModal } from "../../../components/ui/ChangePasswordModal";
import { setThemeMode, ThemeMode } from "../../../state/themeSlice";
import { authApiFetch, signOut } from "../../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { apiFetch, API_BASE } from "../../../state/api";
import { setAvatarUrl, setCredentials } from "../../../state/authSlice";
import { saveSession } from "../../../state/sessionStorage";
import { Modal, FlatList } from "react-native";

// Consistent primary blue color
const DANGER_RED = "#ef4444";
const SUCCESS_GREEN = "#22c55e";

export default function HostSettings() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const auth = useAppSelector((s) => s.auth);
  const { colors } = useTheme();
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
  const buttonBorderColor = isDarkBg
    ? "rgba(75, 85, 99, 0.8)" // darker gray for dark mode
    : colors.border ?? "rgba(0,0,0,0.2)";
  
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [deviceLockEnabled, setDeviceLockEnabled] = useState(false);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [oneDeviceOnly, setOneDeviceOnly] = useState(false);
  const [allowMultipleSessions, setAllowMultipleSessions] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!auth.twoFactorEnabled);
  const [sessionsVisible, setSessionsVisible] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; deviceLabel?: string | null; userAgent?: string | null; createdAt?: string; lastSeenAt?: string }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Mock membership data - replace with actual API call
  const membership = {
    type: "Premium", // or "Free"
    startDate: "2024-01-15",
    endDate: "2025-01-15",
  };

  const onThemeChange = (mode: ThemeMode) => dispatch(setThemeMode(mode));
  const onLogout = () => dispatch(signOut());
  const loadPreferences = async () => {
    try {
      const notif = await AsyncStorage.getItem("notificationsEnabled");
      if (notif === "false") setNotificationsEnabled(false);
      const emailUpd = await AsyncStorage.getItem("emailUpdatesEnabled");
      if (emailUpd === "false") setEmailUpdatesEnabled(false);
      const lock = await AsyncStorage.getItem("deviceLockEnabled");
      if (lock === "true") setDeviceLockEnabled(true);
      const oneDevice = await AsyncStorage.getItem("oneDeviceOnly");
      if (oneDevice === "true") setOneDeviceOnly(true);
      const multiSessions = await AsyncStorage.getItem("allowMultipleSessions");
      if (multiSessions === "false") setAllowMultipleSessions(false);
    } catch {
      // ignore persistence errors
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    setTwoFactorEnabled(!!auth.twoFactorEnabled);
    const nextAllow = auth.allowMultipleSessions ?? true;
    setAllowMultipleSessions(nextAllow);
    // keep local preference aligned with server flag so toggles reflect default
    savePreference("allowMultipleSessions", nextAllow);
  }, [auth.twoFactorEnabled, auth.allowMultipleSessions]);

  // Debug log for host data
  useEffect(() => {
    console.log("[Settings] auth state:", auth);
  }, [auth]);


  const savePreference = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value ? "true" : "false");
    } catch {
      // ignore persistence errors
    }
  };

  const handleToggleOneDevice = async () => {
    const next = !oneDeviceOnly;
    setOneDeviceOnly(next);
    savePreference("oneDeviceOnly", next);
    if (next) {
      Toast.show({
        type: "info",
        text1: "One Device mode enabled",
        text2: "Users will be restricted to the first device they log in on.",
        position: "top",
        visibilityTime: 2000,
      });
    }
  };

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    savePreference("notificationsEnabled", next);
  };

  const handleToggleEmailUpdates = async () => {
    const next = !emailUpdatesEnabled;
    setEmailUpdatesEnabled(next);
    savePreference("emailUpdatesEnabled", next);
  };

  const handleToggleDeviceLock = async () => {
    const next = !deviceLockEnabled;
    if (!next) {
      setDeviceLockEnabled(false);
      savePreference("deviceLockEnabled", false);
      return;
    }

    try {
      const LocalAuthentication = (await import("expo-local-authentication")).default ?? (await import("expo-local-authentication"));
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert("Not available", "Device lock is not available or not set up on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable device lock",
        fallbackLabel: "Use device passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setDeviceLockEnabled(true);
        savePreference("deviceLockEnabled", true);
      } else {
        Alert.alert("Authentication required", "Could not enable device lock without authentication.");
      }
    } catch (e) {
      console.warn("Device lock toggle failed", e);
      Alert.alert("Error", "Could not enable device lock. Please ensure biometric/passcode is set up and try again.");
    }
  };
  
  const handleSaveProfile = async (name: string, email: string) => {
    if (!auth.token) throw new Error("Not authenticated");
    
    // Call API to update profile
    const res = await dispatch<any>(authApiFetch<{ name: string; email: string }>("/host/profile", {
      method: "PATCH",
      body: JSON.stringify({ name, email }),
    }));
    
    const updated = {
      ...auth,
      displayName: res.name,
      email: res.email,
      token: auth.token,
      role: auth.role ?? "host",
    };
    dispatch(setCredentials(updated as any));
    await saveSession(updated as any);
    
    Toast.show({
      type: "success",
      text1: "Profile Updated",
      text2: "Your profile has been updated successfully",
      position: "top",
      visibilityTime: 3000,
    });
  };

  const handleAvatarUpdated = async (url: string) => {
    dispatch(setAvatarUrl(url));
    await saveSession({ ...auth, avatarUrl: url } as any);
  };

  const handleToggleMultipleSessions = async () => {
    const next = !allowMultipleSessions;
    setAllowMultipleSessions(next);
    try {
      const body: any = { allowMultipleSessions: next };
      if (!next && auth.refreshToken) {
        body.refreshToken = auth.refreshToken;
      }
      const res = await dispatch<any>(authApiFetch("/host/security", {
        method: "PATCH",
        body: JSON.stringify(body),
      }));
      const updated = {
        ...auth,
        allowMultipleSessions: next,
        token: auth.token,
        refreshToken: (res as any)?.refreshToken ?? auth.refreshToken,
        role: auth.role ?? "host",
      };
      dispatch(setCredentials(updated as any));
      await saveSession(updated as any);
      savePreference("allowMultipleSessions", next);
      Toast.show({
        type: "info",
        text1: next ? "Multiple sessions allowed" : "Single session enforced",
        text2: next
          ? "Users can stay signed in on multiple devices."
          : "Users will be limited to one active session at a time.",
        position: "top",
        visibilityTime: 2000,
      });
    } catch (e: any) {
      setAllowMultipleSessions(!next);
      const message = e?.message || e?.error || "Failed to update concurrent sessions setting.";
      Alert.alert("Error", message);
    }
  };

  const openSessions = async () => {
    setSessionsVisible(true);
    await loadSessions();
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await dispatch<any>(
        authApiFetch<{ sessions: Array<{ id: string; deviceLabel?: string | null; userAgent?: string | null; createdAt?: string; lastSeenAt?: string }> }>(
          "/host/sessions",
          { method: "GET" }
        )
      );
      setSessions(res.sessions || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load devices");
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await dispatch<any>(
        authApiFetch("/host/sessions/revoke", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        })
      );
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      Toast.show({ type: "success", text1: "Device logged out" });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log out device");
    }
  };

  const handleToggleTwoFactor = async () => {
    if (!auth.role) return;
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    try {
      await dispatch<any>(authApiFetch("/host/security", {
        method: "PATCH",
        body: JSON.stringify({ twoFactorEnabled: next }),
      }));
      const updated = {
        ...auth,
        twoFactorEnabled: next,
        token: auth.token,
        refreshToken: auth.refreshToken,
        role: auth.role ?? "host",
      };
      dispatch(setCredentials(updated as any));
      await saveSession(updated as any);
      Toast.show({
        type: "success",
        text1: "Security updated",
        text2: next ? "OTP required at login." : "OTP disabled for login.",
        position: "top",
        visibilityTime: 2000,
      });
    } catch (e) {
      setTwoFactorEnabled(!next);
      Alert.alert("Error", "Failed to update two-factor login setting.");
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.token) throw new Error("Not authenticated");
    
    // Call API to change password
    await dispatch<any>(authApiFetch("/host/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }));
    
    Toast.show({
      type: "success",
      text1: "Password Changed",
      text2: "Your password has been changed successfully",
      position: "top",
      visibilityTime: 3000,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Manage your account and preferences</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

      {/* Membership Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={22} color={SUCCESS_GREEN} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Membership</Text>
        </View>
        
        <View style={styles.membershipCard}>
          <View style={styles.membershipHeader}>
            <View style={[styles.membershipBadge, { 
              backgroundColor: membership.type === "Premium" ? SUCCESS_GREEN : "#64748b" 
            }]}>
              <Ionicons 
                name={membership.type === "Premium" ? "star" : "person"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.membershipBadgeText}>{membership.type}</Text>
            </View>
            {membership.type === "Premium" && (
              <View style={styles.activeDot}>
                <View style={[styles.activeDotInner, { backgroundColor: SUCCESS_GREEN }]} />
              </View>
            )}
          </View>

          <View style={styles.membershipDetails}>
            <View style={styles.membershipRow}>
              <View style={styles.membershipItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.text} style={{ opacity: 0.6 }} />
                <View style={styles.membershipItemText}>
                  <Text style={[styles.membershipLabel, { color: colors.text }]}>Start Date</Text>
                  <Text style={[styles.membershipValue, { color: colors.text }]}>
                    {formatDate(membership.startDate)}
                  </Text>
                </View>
              </View>
              <View style={styles.membershipItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.text} style={{ opacity: 0.6 }} />
                <View style={styles.membershipItemText}>
                  <Text style={[styles.membershipLabel, { color: colors.text }]}>End Date</Text>
                  <Text style={[styles.membershipValue, { color: colors.text }]}>
                    {formatDate(membership.endDate)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {membership.type === "Free" && (
            <Pressable
              style={[styles.upgradeButton, { backgroundColor: SUCCESS_GREEN }]}
              onPress={() => {}}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Profile Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Pressable onPress={() => setEditProfileVisible(true)}>
              {auth.avatarUrl ? (
                <Image source={{ uri: auth.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: PRIMARY_BLUE }]}>
                  <Text style={styles.avatarText}>
                    {(auth.email ?? "Host").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {auth.displayName ?? auth.email ?? "Host User"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.text }]}>
                {auth.email ?? "host@example.com"}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: PRIMARY_BLUE + "20" }]}>
                <Ionicons name="shield-checkmark" size={14} color={PRIMARY_BLUE} />
                <Text style={[styles.roleText, { color: PRIMARY_BLUE }]}>Host</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileActions}>
            <Pressable
              style={[styles.editButton, { borderColor: buttonBorderColor, borderWidth: 1.5 }]}
              onPress={() => setEditProfileVisible(true)}
            >
              <Ionicons name="create-outline" size={20} color={PRIMARY_BLUE} />
              <Text style={[styles.editButtonText, { color: PRIMARY_BLUE }]}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Security Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
        </View>
        
        <Pressable
          style={[styles.securityButton, { borderWidth: 0 }]}
          onPress={() => setChangePasswordVisible(true)}
        >
          <View style={styles.securityButtonLeft}>
            <View>
              <Text style={[styles.securityButtonTitle, { color: colors.text }]}>
                Change Password
              </Text>
              <Text style={[styles.securityButtonSubtitle, { color: colors.text }]}>
                Update your account password
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} style={{ opacity: 0.5 }} />
        </Pressable>

        <View style={[styles.notificationRow, styles.securityRow]}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>Two-factor login</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Send an OTP to your email when signing in.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: twoFactorEnabled }}
            onPress={handleToggleTwoFactor}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: twoFactorEnabled
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: twoFactorEnabled
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: twoFactorEnabled ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: twoFactorEnabled ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={22} color={colors.text} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        </View>
        
        <View style={styles.themeOptions}>
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.themeOption,
                {
                  backgroundColor: themeMode === mode ? PRIMARY_BLUE : colors.background,
                  borderColor: themeMode === mode ? PRIMARY_BLUE : colors.border,
                },
              ]}
              onPress={() => onThemeChange(mode)}
            >
              <Ionicons
                name={
                  mode === "light"
                    ? "sunny"
                    : mode === "dark"
                    ? "moon"
                    : "phone-portrait-outline"
                }
                size={24}
                color={themeMode === mode ? "#fff" : colors.text}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: themeMode === mode ? "#fff" : colors.text },
                ]}
              >
                {mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light"}
              </Text>
              {themeMode === mode && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Updates</Text>
        </View>
        <View style={styles.notificationRow}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>App Notifications</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Enable push notifications for calls and updates.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: notificationsEnabled }}
            onPress={handleToggleNotifications}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: notificationsEnabled
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: notificationsEnabled
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: notificationsEnabled ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: notificationsEnabled ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View>

        {/* <View style={[styles.notificationRow, { marginTop: 12 }]}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>Email / WhatsApp Updates</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Get product news and tips via email or WhatsApp.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: emailUpdatesEnabled }}
            onPress={handleToggleEmailUpdates}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: emailUpdatesEnabled
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: emailUpdatesEnabled
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: emailUpdatesEnabled ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: emailUpdatesEnabled ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View> */}
      </View>

      {/* Privacy Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>
        </View>
        <View style={styles.notificationRow}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>Device Lock</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Require Face/Touch ID or passcode when opening the app.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: deviceLockEnabled }}
            onPress={handleToggleDeviceLock}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: deviceLockEnabled
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: deviceLockEnabled
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: deviceLockEnabled ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: deviceLockEnabled ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View>

        <View style={[styles.notificationRow, { marginTop: 12 }]}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>One User, One Device</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Lock each user to their first login device. Hosts can approve device changes.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: oneDeviceOnly }}
            onPress={handleToggleOneDevice}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: oneDeviceOnly
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: oneDeviceOnly
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: oneDeviceOnly ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: oneDeviceOnly ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View>

        <View style={[styles.notificationRow, { marginTop: 12 }]}>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>Concurrent Sessions</Text>
            <Text style={[styles.notificationSubtitle, { color: colors.text }]}>
              Allow users to stay signed in on multiple devices at once.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: allowMultipleSessions }}
            onPress={handleToggleMultipleSessions}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: allowMultipleSessions
                  ? PRIMARY_BLUE + "55"
                  : isDarkBg
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)",
                borderColor: allowMultipleSessions
                  ? colors.border ?? "transparent"
                  : colors.border ?? (isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"),
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: allowMultipleSessions ? PRIMARY_BLUE : colors.card ?? "#f9fafb",
                  transform: [{ translateX: allowMultipleSessions ? 20 : 0 }],
                  shadowColor: "#000",
                },
              ]}
            />
          </Pressable>
        </View>
        <Pressable style={{ marginTop: 8 }} onPress={openSessions}>
          <Text style={{ color: PRIMARY_BLUE, fontWeight: "600" }}>View logged-in devices</Text>
        </Pressable>
      </View>

      {/* Support Section */}
      {/* <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        </View>
        <View style={styles.infoRows}>
          <Pressable
            style={[styles.infoRowPressable, { borderColor: colors.border }]}
            onPress={() => Linking.openURL("https://wa.me/918000244655")}
          >
            <View style={styles.infoRowLeft}>
              <Ionicons name="logo-whatsapp" size={20} color={PRIMARY_BLUE} />
              <Text style={[styles.infoLabel, { color: colors.text }]}>WhatsApp (+918000244655)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.6 }} />
          </Pressable>
          <Pressable
            style={[styles.infoRowPressable, { borderColor: colors.border }]}
            onPress={() => Linking.openURL("mailto:mizcallofficial@gamil.com")}
          >
            <View style={styles.infoRowLeft}>
              <Ionicons name="mail-outline" size={20} color={PRIMARY_BLUE} />
              <Text style={[styles.infoLabel, { color: colors.text }]}>Email (mizcallofficial@gamil.com)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.6 }} />
          </Pressable>
        </View>
      </View> */}

      {/* Account Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        </View>
        
        <View style={styles.accountActions}>
          <Pressable
            style={[styles.logoutButton, { backgroundColor: DANGER_RED }]}
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </View>

      {/* App Info Section */}
      <View style={[styles.section, styles.appInfoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Information</Text>
        </View>
        
        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Role</Text>
            <Text style={[styles.infoValue, { color: PRIMARY_BLUE }]}>Host</Text>
          </View>
      </View>
    </View>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
        currentName={auth.displayName ?? auth.email ?? ""}
        currentEmail={auth.email ?? ""}
        onSave={handleSaveProfile}
        avatarUrl={auth.avatarUrl ?? null}
        token={auth.token ?? null}
        onAvatarUpdated={handleAvatarUpdated}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onSave={handleChangePassword}
      />

      <Modal visible={sessionsVisible} animationType="slide" onRequestClose={() => setSessionsVisible(false)}>
        <View style={{ flex: 1, padding: 16, paddingTop: 48, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Pressable onPress={() => setSessionsVisible(false)} style={{ padding: 8, marginRight: 8 }}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Logged-in devices</Text>
          </View>
          <FlatList
            data={sessions}
            refreshing={sessionsLoading}
            onRefresh={loadSessions}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={{ color: colors.text, textAlign: "center", marginTop: 24 }}>
                {sessionsLoading ? "Loading..." : "No active devices"}
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  marginBottom: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border ?? "#e5e7eb",
                  backgroundColor: colors.card,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {item.deviceLabel || "Unknown device"}
                </Text>
                {item.userAgent ? (
                  <Text style={{ color: colors.text, opacity: 0.7, marginTop: 4 }}>{item.userAgent}</Text>
                ) : null}
                <Pressable
                  onPress={() => revokeSession(item.id)}
                  style={{
                    marginTop: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: DANGER_RED,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Log out device</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    opacity: 0.8,
  },
  section: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  membershipCard: {
    gap: 14,
  },
  membershipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  membershipBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  membershipDetails: {
    gap: 12,
  },
  membershipRow: {
    flexDirection: "row",
    gap: 12,
  },
  membershipItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  membershipItemText: {
    flex: 1,
    gap: 4,
  },
  membershipLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  membershipValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  profileCard: {
    gap: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e5e7eb",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 26,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  profileActions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    width: "100%",
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  securityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  securityButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  securityButtonSubtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  notificationText: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  notificationSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  securityRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    justifyContent: "center",
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
  themeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  accountActions: {
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  infoRows: {
    gap: 12,
  },
  infoRowPressable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  appInfoSection: {
    marginBottom: 40,
  },
  infoLabel: {
    fontSize: 15,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    opacity: 0.3,
  },
});

