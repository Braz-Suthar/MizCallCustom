import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { apiFetch } from "../state/api";

// Configure notification behavior (only on Android)
if (Platform.OS === "android") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn("[Notifications] Failed to set handler:", error);
  }
}

export class NotificationService {
  private static token: string | null = null;
  private static authToken: string | null = null;

  /**
   * Request notification permissions and get FCM token
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Skip FCM on iOS (requires paid Apple Developer account)
      if (Platform.OS === "ios") {
        console.log("[Notifications] ⚠️ FCM disabled on iOS (requires paid Apple Developer account)");
        console.log("[Notifications] iOS notifications will be enabled once you have a paid account");
        return false;
      }

      // Only request on physical devices
      if (!Device.isDevice) {
        console.log("[Notifications] Skipping on simulator/emulator");
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[Notifications] Permission denied");
        return false;
      }

      console.log("[Notifications] ✅ Permission granted");
      return true;
    } catch (error) {
      console.error("[Notifications] Permission request failed:", error);
      return false;
    }
  }

  /**
   * Get FCM token and register with backend
   */
  static async registerDevice(authToken: string): Promise<boolean> {
    try {
      // Skip FCM on iOS (requires paid Apple Developer account)
      if (Platform.OS === "ios") {
        console.log("[Notifications] ⚠️ Skipping FCM registration on iOS");
        return false;
      }

      if (!Device.isDevice) {
        console.log("[Notifications] Skipping registration on simulator/emulator");
        return false;
      }

      // Get FCM token (Android only)
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "0aa170c5-60bd-47c2-8015-cebd6a3717b6", // Your EAS project ID
      });

      const fcmToken = tokenData.data;
      this.token = fcmToken;
      this.authToken = authToken;

      console.log("[Notifications] ========================================");
      console.log("[Notifications] FCM Device Token (Full):");
      console.log(fcmToken);
      console.log("[Notifications] ========================================");

      // Register with backend
      const result = await apiFetch<{ ok: boolean; firebaseAvailable: boolean }>(
        "/notifications/register-token",
        authToken,
        {
          method: "POST",
          body: JSON.stringify({
            token: fcmToken,
            platform: Platform.OS,
            deviceName: Device.deviceName || undefined,
          }),
        }
      );

      if (result.ok) {
        console.log("[Notifications] ✅ Registered with backend. Firebase available:", result.firebaseAvailable);
        if (!result.firebaseAvailable) {
          console.warn("[Notifications] ⚠️ Backend Firebase not configured. Notifications disabled.");
        }
      }

      return result.ok;
    } catch (error) {
      console.error("[Notifications] Registration failed:", error);
      return false;
    }
  }

  /**
   * Unregister device token from backend
   */
  static async unregisterDevice(): Promise<void> {
    try {
      if (!this.token || !this.authToken) {
        return;
      }

      await apiFetch(
        "/notifications/unregister-token",
        this.authToken,
        {
          method: "POST",
          body: JSON.stringify({ token: this.token }),
        }
      );

      console.log("[Notifications] ✅ Unregistered from backend");
      this.token = null;
      this.authToken = null;
    } catch (error) {
      console.error("[Notifications] Unregister failed:", error);
    }
  }

  /**
   * Setup notification listeners
   * Returns cleanup function
   */
  static setupListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Skip on iOS (not configured)
    if (Platform.OS === "ios") {
      console.log("[Notifications] Listeners skipped on iOS");
      return () => {}; // No-op cleanup
    }

    try {
      // Listener for notifications received while app is in foreground
      const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notifications] Received:", notification);
        onNotificationReceived?.(notification);
      });

      // Listener for notifications tapped (app was in background/killed)
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[Notifications] Tapped:", response);
        onNotificationTapped?.(response);
      });

      // Android notification channel (required)
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3c82f6",
          sound: "default",
        });

        // Channel for calls (high priority)
        Notifications.setNotificationChannelAsync("calls", {
          name: "Calls",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: "#22c55e",
          sound: "default",
          enableVibrate: true,
        });
      }

      // Return cleanup function
      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error("[Notifications] Failed to setup listeners:", error);
      return () => {}; // No-op cleanup
    }
  }

  /**
   * Show local notification (for testing)
   */
  static async showLocalNotification(title: string, body: string, data: any = {}) {
    if (Platform.OS === "ios") {
      console.log("[Notifications] Local notifications disabled on iOS");
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("[Notifications] Show local failed:", error);
    }
  }

  /**
   * Check notification status
   */
  static async getStatus(): Promise<{ enabled: boolean; token: string | null }> {
    if (Platform.OS === "ios") {
      return { enabled: false, token: null };
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return {
        enabled: status === "granted",
        token: this.token,
      };
    } catch (error) {
      return { enabled: false, token: null };
    }
  }
}
