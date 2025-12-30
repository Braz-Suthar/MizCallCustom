import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { useColorScheme, PermissionsAndroid, Platform } from "react-native";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { registerGlobals } from "react-native-webrtc";
import { setAudioModeAsync } from "expo-audio";
import Toast from "react-native-toast-message";

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

  // Configure audio to allow simultaneous record/playback and speaker output
  useEffect(() => {
    const configureAudio = async () => {
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
        }}
      />
      <Toast />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
