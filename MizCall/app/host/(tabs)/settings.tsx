import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { AppButton } from "../../../components/ui/AppButton";
import { EditProfileModal } from "../../../components/ui/EditProfileModal";
import { ChangePasswordModal } from "../../../components/ui/ChangePasswordModal";
import { setThemeMode, ThemeMode } from "../../../state/themeSlice";
import { signOut } from "../../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../../state/store";
import { apiFetch } from "../../../state/api";

// Consistent primary blue color
const DANGER_RED = "#ef4444";
const SUCCESS_GREEN = "#22c55e";

export default function HostSettings() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const auth = useAppSelector((s) => s.auth);
  const { colors } = useTheme();
  const PRIMARY_BLUE = colors.primary;
  
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  // Mock membership data - replace with actual API call
  const membership = {
    type: "Premium", // or "Free"
    startDate: "2024-01-15",
    endDate: "2025-01-15",
  };

  const onThemeChange = (mode: ThemeMode) => dispatch(setThemeMode(mode));
  const onLogout = () => dispatch(signOut());
  
  const handleSaveProfile = async (name: string, email: string) => {
    if (!auth.token) throw new Error("Not authenticated");
    
    // Call API to update profile
    await apiFetch("/host/profile", auth.token, {
      method: "PATCH",
      body: JSON.stringify({ name, email }),
    });
    
    Toast.show({
      type: "success",
      text1: "Profile Updated",
      text2: "Your profile has been updated successfully",
      position: "top",
      visibilityTime: 3000,
    });
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.token) throw new Error("Not authenticated");
    
    // Call API to change password
    await apiFetch("/host/change-password", auth.token, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
        
        <View style={styles.profileCard}>
        <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: PRIMARY_BLUE }]}>
              <Text style={styles.avatarText}>
                {(auth.email ?? "Host").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {auth.email ?? "Host User"}
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
          
          <Pressable
            style={[styles.editButton, { borderColor: colors.border }]}
            onPress={() => setEditProfileVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color={PRIMARY_BLUE} />
            <Text style={[styles.editButtonText, { color: PRIMARY_BLUE }]}>Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* Security Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
        </View>
        
        <Pressable
          style={[styles.securityButton, { borderColor: colors.border }]}
          onPress={() => setChangePasswordVisible(true)}
        >
          <View style={styles.securityButtonLeft}>
            <View style={[styles.securityIcon, { backgroundColor: PRIMARY_BLUE + "20" }]}>
              <Ionicons name="key" size={18} color={PRIMARY_BLUE} />
            </View>
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
        currentName={auth.email ?? ""}
        currentEmail={auth.email ?? ""}
        onSave={handleSaveProfile}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onSave={handleChangePassword}
      />
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
    paddingBottom: 12,
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
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

