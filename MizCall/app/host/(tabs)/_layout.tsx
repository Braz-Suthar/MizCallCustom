import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useMemo } from "react";
import { useColorScheme, Image } from "react-native";

import { useAppSelector } from "../../../state/store";
import { useSocket } from "../../../hooks/useSocket";

// Consistent primary blue color
const PRIMARY_BLUE = "#5B9FFF";

export default function HostTabsLayout() {
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const email = useAppSelector((s) => s.auth.email);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const isDark = resolvedScheme === "dark";

  const session = useMemo(
    () =>
      token && role === "host"
        ? { role, token, email: email ?? undefined }
        : null,
    [token, role, email],
  );

  useSocket(useMemo(() => session, [session]));

  if (!session) {
    return <Redirect href="/" />;
  }

  const ICON_SIZE = 28;

  const renderIcon = (source: any, color: string) => (
    <Image
      source={source}
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        tintColor: color,
        resizeMode: "contain",
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: PRIMARY_BLUE,
        tabBarInactiveTintColor: isDark ? "#888" : "#666",
        tabBarStyle: { 
          backgroundColor: isDark ? "#1a1d29" : "#ffffff",
          borderTopWidth: isDark ? 0 : 1,
          borderTopColor: isDark ? "transparent" : "#e0e0e0",
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
          tabBarIcon: ({ color }) =>
            renderIcon(require("../../../assets/ui_icons/dashboard.png"), color as string),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) =>
            renderIcon(require("../../../assets/ui_icons/users.png"), color as string),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarIcon: ({ color }) =>
            renderIcon(require("../../../assets/ui_icons/calls.png"), color as string),
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: "Recordings",
          tabBarIcon: ({ color }) =>
            renderIcon(require("../../../assets/ui_icons/recordings.png"), color as string),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            renderIcon(require("../../../assets/ui_icons/settings.png"), color as string),
        }}
      />
    </Tabs>
  );
}

