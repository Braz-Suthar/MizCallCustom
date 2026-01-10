import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image as SvgIcon } from "expo-image";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { Fab } from "../../../components/ui/Fab";
import { AppButton } from "../../../components/ui/AppButton";
import { DeleteConfirmationModal } from "../../../components/ui/DeleteConfirmationModal";
import { UserSessionsModal } from "../../../components/ui/UserSessionsModal";
import { authApiFetch } from "../../../state/authActions";
import { useAppDispatch, useAppSelector } from "../../../state/store";

const ICONS = {
  search: require("../../../assets/ui_icons/Search.svg"),
  close: require("../../../assets/ui_icons/Close_Cross_Circle.svg"),
  eye: require("../../../assets/ui_icons/Eye.svg"),
  edit: require("../../../assets/ui_icons/Square_Pencil.svg"),
  trash: require("../../../assets/ui_icons/Trash.svg"),
};

export default function HostUsers() {
  const { colors } = useTheme();
  const primaryColor = colors.primary ?? "#3c82f6";
  const closeBorderColor = colors.border ?? (colors.text ? `${colors.text}77` : "rgba(255,255,255,0.45)");
  const isDarkBg = (() => {
    const bg = colors.background ?? "#000";
    const hex = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 140;
    }
    return false;
  })();
  const closeButtonBg = isDarkBg ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";
  const secondaryButtonBg = isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const secondaryButtonBorder = colors.border ?? (isDarkBg ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, role } = useAppSelector((s) => s.auth);
  const [users, setUsers] = useState<Array<{ id: string; username: string; enabled: boolean; password?: string; deviceInfo?: string; avatar_url?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "disabled">("all");
  
  // Modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; enabled: boolean; password?: string; deviceInfo?: string; avatar_url?: string | null; enforce_single_device?: boolean | null } | null>(null);
  
  // Edit form states
  const [editUsername, setEditUsername] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editEnforceSingleDevice, setEditEnforceSingleDevice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const handleAllowDeviceChange = () => {
    Toast.show({
      type: "info",
      text1: "Request noted",
      text2: "Approve device change from the host dashboard.",
      position: "top",
      visibilityTime: 1800,
      topOffset: 48,
    });
  };

  const load = async () => {
    if (!token || role !== "host") return;
    setLoading(true);
    try {
      const res = await dispatch<any>(authApiFetch<{ users: { id: string; username: string; enabled: boolean; avatar_url?: string | null }[] }>("/host/users"));
      console.log("[expo][users] fetched users:", res.users);
      setUsers(res.users);
    } catch (e) {
      // silently ignore for now; could show toast
      console.log("[expo][users] fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [token, role]),
  );

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Apply search filter
      const matchesSearch = 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply status filter
      const matchesStatus = 
        filterStatus === "all" || 
        (filterStatus === "active" && user.enabled) ||
        (filterStatus === "disabled" && !user.enabled);
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, filterStatus]);

  // Generate initials from username
  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate color based on username
  const getProfileColor = (username: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const resolveAvatarUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith("http")) return url;
    return `https://custom.mizcall.com${url}`;
  };

  const handleView = async (user: any) => {
    // Fetch user details with password
    try {
    const userData = await dispatch<any>(authApiFetch<{ user: any }>(`/host/users/${user.id}`));
    setSelectedUser({
      ...user,
      password: userData.user?.password ?? "",
      deviceInfo: userData.user?.device_info ?? "",
      avatar_url: userData.user?.avatar_url ?? user.avatar_url ?? null,
    });
      setViewModalVisible(true);
    } catch (e) {
      setSelectedUser({ ...user, password: "", deviceInfo: "" });
      setViewModalVisible(true);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditEnabled(user.enabled);
    setEditPassword(""); // Empty means don't change
    setEditEnforceSingleDevice(user.enforce_single_device ?? null);
    setEditModalVisible(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: "success",
      text1: "Copied",
      text2: `${label} copied to clipboard`,
      position: "top",
      visibilityTime: 1800,
      topOffset: 48,
    });
  };

  const copyBoth = async () => {
    if (!selectedUser) return;
    const pwd = selectedUser.password ?? "";
    if (!pwd) {
      Toast.show({
        type: "info",
        text1: "Password not available",
        text2: "No password to copy for this user.",
        position: "top",
        visibilityTime: 1800,
        topOffset: 48,
      });
      return;
    }
    const text = `User ID: ${selectedUser.id}\nPassword: ${pwd}`;
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: "success",
      text1: "Copied",
      text2: "User ID and password copied to clipboard",
      position: "top",
      visibilityTime: 1800,
      topOffset: 48,
    });
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser || !token) return;

    setDeleting(true);
    try {
      await dispatch<any>(authApiFetch(`/host/users/${selectedUser.id}`, { method: "DELETE" }));
      // Refresh the list
      load();
      setDeleteModalVisible(false);
      setSelectedUser(null);
    } catch (e) {
      Alert.alert("Error", "Failed to delete user. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || !token) return;
    
    if (!editUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        username: editUsername.trim(),
        enabled: editEnabled,
        enforceSingleDevice: editEnforceSingleDevice,
      };
      
      // Only include password if it was changed
      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }

      await dispatch<any>(authApiFetch(`/host/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      }));
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, username: editUsername.trim(), enabled: editEnabled }
          : u
      ));
      
      setEditModalVisible(false);
      setSelectedUser(null);
      setEditPassword("");
    } catch (e) {
      Alert.alert("Error", "Failed to update user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Users</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Manage and view all registered users.</Text>

        {/* Search and Filter Row */}
        <View style={styles.searchFilterRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SvgIcon source={ICONS.search} style={[styles.searchIcon, { width: 20, height: 20 }]} tintColor={colors.text} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users..."
              placeholderTextColor={colors.text + "80"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <SvgIcon source={ICONS.close} style={{ width: 20, height: 20 }} tintColor={colors.text} />
              </Pressable>
            )}
          </View>
          
          <Pressable 
            style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              if (filterStatus === "all") setFilterStatus("active");
              else if (filterStatus === "active") setFilterStatus("disabled");
              else setFilterStatus("all");
            }}
          >
            <Ionicons 
              name="filter" 
              size={20} 
              color={filterStatus !== "all" ? primaryColor : colors.text} 
            />
            {filterStatus !== "all" && (
              <View style={[styles.filterBadge, { backgroundColor: primaryColor }]} />
            )}
          </Pressable>
        </View>

        {/* Active Filter Indicator */}
        {filterStatus !== "all" && (
          <View style={styles.filterIndicator}>
            <Text style={[styles.filterText, { color: colors.text }]}>
              Showing: {filterStatus === "active" ? "Active" : "Disabled"} users
            </Text>
            <Pressable onPress={() => setFilterStatus("all")}>
              <Text style={[styles.clearFilter, { color: primaryColor }]}>Clear</Text>
            </Pressable>
          </View>
        )}

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={primaryColor} colors={[primaryColor]} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardContent}>
                {/* Profile Picture */}
                {item.avatar_url ? (
                  <SvgIcon
                    source={{ uri: resolveAvatarUrl(item.avatar_url) }}
                    style={styles.profilePicImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.profilePic, { backgroundColor: getProfileColor(item.username) }]}>
                    <Text style={styles.profileInitials}>{getInitials(item.username)}</Text>
                  </View>
                )}

                {/* User Info */}
                <View style={styles.userInfo}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.username}</Text>
                <Text style={[styles.chip, { backgroundColor: item.enabled ? "#22c55e22" : "#f9731622", color: item.enabled ? "#16a34a" : "#ea580c" }]}>
                  {item.enabled ? "Active" : "Disabled"}
                </Text>
              </View>
              <Text style={[styles.cardId, { color: colors.text }]}>{item.id}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable 
                  style={[styles.actionButton, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }]}
                  onPress={() => handleView(item)}
                >
              <SvgIcon source={ICONS.eye} style={{ width: 18, height: 18 }} tintColor={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>View</Text>
                </Pressable>

                <Pressable 
                  style={[styles.actionButton, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }]}
                  onPress={() => handleEdit(item)}
                >
              <SvgIcon source={ICONS.edit} style={{ width: 18, height: 18 }} tintColor={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
                </Pressable>

                <Pressable 
                  style={[styles.actionButton, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }]}
                  onPress={() => handleDelete(item)}
                >
              <SvgIcon source={ICONS.trash} style={{ width: 18, height: 18 }} tintColor={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.empty, { color: colors.text }]}>
                {searchQuery || filterStatus !== "all" ? "No users found" : "No users yet"}
              </Text>
            ) : null
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 80, gap: 10 }}
        />
      </View>
      <Fab icon="person-add" accessibilityLabel="Add user" onPress={() => router.push("/host/create-user")} />

      {/* View User Modal */}
      <Modal
        visible={viewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setViewModalVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>User Details</Text>
              <Pressable
                style={[styles.closeButton, { borderColor: closeBorderColor, backgroundColor: closeButtonBg }]}
                onPress={() => setViewModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedUser.avatar_url ? (
                  <SvgIcon
                    source={{ uri: resolveAvatarUrl(selectedUser.avatar_url) }}
                    style={styles.profilePicLarge}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.profilePicLarge, { backgroundColor: getProfileColor(selectedUser.username) }]}>
                    <Text style={styles.profileInitialsLarge}>{getInitials(selectedUser.username)}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Username</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser.username}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>User ID</Text>
                  <View style={styles.detailValueRow}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser.id}</Text>
                    <Pressable onPress={() => copyToClipboard(selectedUser.id, "User ID")}>
                      <Ionicons name="copy-outline" size={20} color={primaryColor} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Password</Text>
                  <View style={styles.detailValueRow}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedUser.password ? selectedUser.password : "Not available"}
                    </Text>
                    {selectedUser.password ? (
                      <Pressable onPress={() => copyToClipboard(selectedUser.password!, "Password")}>
                        <Ionicons name="copy-outline" size={20} color={primaryColor} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Status</Text>
                  <Text style={[styles.chip, { backgroundColor: selectedUser.enabled ? "#22c55e22" : "#f9731622", color: selectedUser.enabled ? "#16a34a" : "#ea580c" }]}>
                    {selectedUser.enabled ? "Active" : "Disabled"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Device</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedUser.deviceInfo ? selectedUser.deviceInfo : "No device recorded"}
                  </Text>
                </View>


                {/* Copy Actions */}
                <View style={styles.copyActions}>
                  <Pressable 
                    style={[styles.copyButton, { backgroundColor: primaryColor }]}
                    onPress={copyBoth}
                  >
                    <Ionicons name="copy" size={18} color="#fff" />
                    <Text style={styles.copyButtonText}>Copy User ID & Password</Text>
                  </Pressable>
                </View>

                {/* Manage Sessions Button */}
                <Pressable
                  style={[styles.manageSessionsButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setViewModalVisible(false);
                    setTimeout(() => setSessionsModalVisible(true), 300);
                  }}
                >
                  <Ionicons name="phone-portrait-outline" size={20} color={primaryColor} />
                  <Text style={[styles.manageSessionsText, { color: primaryColor }]}>Manage Sessions</Text>
                </Pressable>

                <AppButton
                  label="Close"
                  onPress={() => setViewModalVisible(false)}
                  variant="secondary"
                  fullWidth
                  style={{ backgroundColor: secondaryButtonBg, borderColor: secondaryButtonBorder, borderWidth: 1 }}
                />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit User</Text>
              <Pressable
                style={[styles.closeButton, { borderColor: closeBorderColor, backgroundColor: closeButtonBg }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Username</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Enter username"
                  placeholderTextColor={colors.text + "80"}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>User ID</Text>
                <Text style={[styles.readOnlyText, { color: colors.text }]}>{selectedUser?.id}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder="Leave empty to keep current password"
                  placeholderTextColor={colors.text + "80"}
                  secureTextEntry={false}
                  autoCapitalize="none"
                />
                <Text style={[styles.helperText, { color: colors.text }]}>
                  Leave empty to keep current password
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Status</Text>
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      editEnabled && styles.toggleButtonActive,
                      editEnabled && { backgroundColor: primaryColor },
                      !editEnabled && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEditEnabled(true)}
                  >
                    <Text style={[styles.toggleText, editEnabled && styles.toggleTextActive, { color: editEnabled ? "#fff" : colors.text }]}>
                      Active
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      !editEnabled && styles.toggleButtonActive,
                      !editEnabled && { backgroundColor: "#ef4444" },
                      editEnabled && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEditEnabled(false)}
                  >
                    <Text style={[styles.toggleText, !editEnabled && styles.toggleTextActive, { color: !editEnabled ? "#fff" : colors.text }]}>
                      Disabled
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>One Device Only</Text>
                <Text style={[styles.helperText, { color: colors.text }]}>
                  Control device restriction for this user
                </Text>
                <View style={styles.deviceToggleRow}>
                  <Pressable
                    style={[
                      styles.deviceToggleButton,
                      editEnforceSingleDevice === null && { backgroundColor: primaryColor, borderColor: primaryColor },
                      editEnforceSingleDevice !== null && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEditEnforceSingleDevice(null)}
                  >
                    <Text style={[
                      styles.deviceToggleText, 
                      { color: editEnforceSingleDevice === null ? "#fff" : colors.text }
                    ]}>
                      Inherit
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.deviceToggleButton,
                      editEnforceSingleDevice === true && { backgroundColor: primaryColor, borderColor: primaryColor },
                      editEnforceSingleDevice !== true && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEditEnforceSingleDevice(true)}
                  >
                    <Text style={[
                      styles.deviceToggleText, 
                      { color: editEnforceSingleDevice === true ? "#fff" : colors.text }
                    ]}>
                      Force
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.deviceToggleButton,
                      editEnforceSingleDevice === false && { backgroundColor: primaryColor, borderColor: primaryColor },
                      editEnforceSingleDevice !== false && { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                    ]}
                    onPress={() => setEditEnforceSingleDevice(false)}
                  >
                    <Text style={[
                      styles.deviceToggleText, 
                      { color: editEnforceSingleDevice === false ? "#fff" : colors.text }
                    ]}>
                      Allow
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Cancel"
                    onPress={() => setEditModalVisible(false)}
                    variant="secondary"
                    fullWidth
                  style={{ backgroundColor: secondaryButtonBg, borderColor: secondaryButtonBorder, borderWidth: 1 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Save"
                    onPress={handleSaveEdit}
                    loading={saving}
                    disabled={saving}
                    fullWidth
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <AppButton
                  label="Allow device change"
                  variant="secondary"
                  onPress={handleAllowDeviceChange}
                  fullWidth
                  style={{ borderColor: secondaryButtonBorder, backgroundColor: secondaryButtonBg, borderWidth: 1 }}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        itemName={selectedUser?.username}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedUser(null);
        }}
        loading={deleting}
      />

      {/* User Sessions Modal */}
      <UserSessionsModal
        visible={sessionsModalVisible}
        userId={selectedUser?.id || null}
        username={selectedUser?.username || null}
        onClose={() => {
          setSessionsModalVisible(false);
          setSelectedUser(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
  },
  searchFilterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
  },
  clearFilter: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardContent: {
    flexDirection: "row",
    gap: 12,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePicImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  profileInitials: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  cardId: {
    opacity: 0.7,
    fontWeight: "500",
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  modalBody: {
    gap: 16,
  },
  profilePicLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  profileInitialsLarge: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
    opacity: 0.7,
    flex: 0,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    justifyContent: "flex-end",
  },
  copyActions: {
    marginTop: 8,
    marginBottom: 8,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  formGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  readOnlyText: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    opacity: 0.7,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: "italic",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    // backgroundColor set dynamically
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#fff",
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  manageSessionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  manageSessionsText: {
    fontSize: 15,
    fontWeight: "600",
  },
  deviceToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  deviceToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

