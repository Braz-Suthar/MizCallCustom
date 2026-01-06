import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";

import { Image } from "expo-image";

import { useAppSelector } from "../../../state/store";
import { socketManager } from "../../../services/socketManager";

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

  // Initialize socket manager for host
  useEffect(() => {
    if (token && role === "host") {
      socketManager.initialize(token);
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

