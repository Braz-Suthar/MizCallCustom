import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { Image } from "expo-image";

import { useAppSelector } from "../../../state/store";
import { socketManager } from "../../../services/socketManager";
import { NotificationService } from "../../../services/notificationService";

export default function HostTabsLayout() {
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const email = useAppSelector((s) => s.auth.email);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const { colors } = useTheme();
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const isDark = resolvedScheme === "dark";
  const tabBackground = colors.card ?? colors.background;
  const tabBorderColor = isDark ? "transparent" : colors.border;

  const session = useMemo(
    () =>
      token && role === "host"
        ? { role, token, email: email ?? undefined }
        : null,
    [token, role, email],
  );

  // Initialize socket manager and notifications for host
  useEffect(() => {
    if (token && role === "host") {
      socketManager.initialize(token);
      
      // Setup push notifications
      const setupNotifications = async () => {
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          await NotificationService.registerDevice(token);
        }
      };
      setupNotifications();
      
      // Setup notification listeners
      const cleanupNotifications = NotificationService.setupListeners(
        // On notification received (foreground)
        (notification) => {
          Toast.show({
            type: "info",
            text1: notification.request.content.title || "Notification",
            text2: notification.request.content.body || "",
            position: "top",
            visibilityTime: 4000,
            topOffset: 48,
          });
        }
      );
      
      return () => {
        cleanupNotifications();
      };
    }
  }, [token, role]);

  if (!session) {
    return <Redirect href="/" />;
  }

  const ICON_SIZE = 26;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? "#888" : "#666",
        tabBarStyle: { 
          backgroundColor: tabBackground,
          borderTopWidth: isDark ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: tabBorderColor,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/ui_icons/home.svg")}
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              tintColor={color}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/ui_icons/users.svg")}
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              tintColor={color}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/ui_icons/calls.svg")}
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              tintColor={color}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: "Recordings",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/ui_icons/recordings.svg")}
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              tintColor={color}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/ui_icons/settings.svg")}
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
              tintColor={color}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

