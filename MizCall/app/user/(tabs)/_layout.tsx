import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React, { useMemo } from "react";

import { useAppSelector } from "../../../state/store";
import { useSocket } from "../../../hooks/useSocket";

export default function UserTabsLayout() {
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.role);
  const userId = useAppSelector((s) => s.auth.userId);

  const session = useMemo(() => {
    if (token && role === "user") {
      return { role, token, userId: userId ?? undefined };
    }
    return null;
  }, [token, role, userId]);

  useSocket(useMemo(() => session, [session]));

  if (!session) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1f80ff",
        tabBarStyle: { borderTopWidth: 0.5, borderTopColor: "#e0e4ea" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: "Recordings",
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

