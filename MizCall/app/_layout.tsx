import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { useColorScheme, PermissionsAndroid, Platform, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { registerGlobals } from "react-native-webrtc";
import { setAudioModeAsync } from "expo-audio";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { store, useAppSelector } from "../state/store";
import { useCallEvents } from "../hooks/useCallEvents";

function RootLayoutNav() {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const theme = resolvedScheme === "dark" ? DarkTheme : DefaultTheme;
  useCallEvents();
  registerGlobals();

  // Request mic permission early (Android)
  useEffect(() => {
    const requestMic = async () => {
      if (Platform.OS !== "android") return;
      try {
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (res !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("[app/_layout] Microphone permission not granted");
        }
      } catch (e) {
        console.warn("[app/_layout] Mic permission request failed", e);
      }
    };
    requestMic();
  }, []);

  // Configure audio to allow simultaneous record/playback and speaker output (mobile only)
  useEffect(() => {
    const configureAudio = async () => {
      if (Platform.OS !== "ios" && Platform.OS !== "android") return;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "doNotMix",
          allowsRecording: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn("[app/_layout] Audio mode config failed", e);
      }
    };
    configureAudio();
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: Platform.OS === "ios" ? styles.iosContainer : undefined,
        }}
      />
      <View style={styles.toastContainer} pointerEvents="box-none">
        <Toast />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  iosContainer: {
    paddingTop: 20,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <RootLayoutNav />
      </Provider>
    </SafeAreaProvider>
  );
}
