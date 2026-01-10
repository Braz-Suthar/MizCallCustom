import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Alert, StyleSheet, useColorScheme } from "react-native";
import { useTheme } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAppDispatch, useAppSelector } from "../../../state/store";
import { socketManager } from "../../../services/socketManager";
import { signOut } from "../../../state/authActions";
import { NotificationService } from "../../../services/notificationService";
import { setActiveCall } from "../../../state/callSlice";

export default function UserTabsLayout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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

  // Initialize persistent socket connection and notifications
  useEffect(() => {
    if (token && role === "user") {
      console.log("[UserTabsLayout] Initializing socketManager for user");
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
          const data = notification.request.content.data as any;
          console.log("[UserTabsLayout] Notification received:", data);
          
          // Show in-app toast
          Toast.show({
            type: "info",
            text1: notification.request.content.title || "Notification",
            text2: notification.request.content.body || "",
            position: "top",
            visibilityTime: 4000,
            topOffset: 48,
          });
        },
        // On notification tapped (background/killed)
        (response) => {
          const data = response.notification.request.content.data as any;
          console.log("[UserTabsLayout] Notification tapped:", data);
          
          // Handle different notification types
          if (data.type === "call_started" && data.roomId) {
            // Navigate to call screen
            dispatch(setActiveCall({
              roomId: data.roomId,
              routerRtpCapabilities: data.routerRtpCapabilities || null,
              hostProducerId: data.hostProducerId || null,
            }));
            router.push("/user/active-call");
          }
        }
      );
      
      // Listen for session revocation
      const socket = socketManager.getSocket();
      if (socket) {
        socket.on("SESSION_REVOKED", (data) => {
          console.log("[UserTabsLayout] Session revoked:", data);
          
          const message = data.message || "You have been logged out.";
          
          // Show alert and log out
          setTimeout(() => {
            Toast.show({
              type: "error",
              text1: "Logged Out",
              text2: message,
              position: "top",
              visibilityTime: 5000,
              topOffset: 48,
            });
            
            // Log out after showing toast
            setTimeout(() => {
              dispatch(signOut());
              router.replace("/");
            }, 1000);
          }, 100);
        });
      }
      
      return () => {
        // Cleanup listeners
        const socket = socketManager.getSocket();
        socket?.off("SESSION_REVOKED");
        cleanupNotifications();
      };
    }
  }, [token, role, dispatch, router]);

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

