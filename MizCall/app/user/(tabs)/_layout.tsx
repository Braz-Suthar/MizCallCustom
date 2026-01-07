import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { useTheme } from "@react-navigation/native";

import { useAppSelector } from "../../../state/store";
import { socketManager } from "../../../services/socketManager";

export default function UserTabsLayout() {
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const userId = useAppSelector((s) => s.auth.userId);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const { colors } = useTheme();
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const isDark = resolvedScheme === "dark";
  const tabBackground = colors.card ?? colors.background;
  const tabBorderColor = isDark ? "transparent" : colors.border;

  const session = useMemo(() => {
    if (token && role === "user") {
      return { role, token, userId: userId ?? undefined };
    }
    return null;
  }, [token, role, userId]);

  // Initialize persistent socket connection
  useEffect(() => {
    if (token && role === "user") {
      console.log("[UserTabsLayout] Initializing socketManager for user");
      socketManager.initialize(token);
    }
  }, [token, role]);

  if (!session) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: "Recordings",
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

