import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useMemo } from "react";
import { useColorScheme } from "react-native";

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarIcon: ({ color, size }) => <Ionicons name="call" size={size} color={color} />,
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

