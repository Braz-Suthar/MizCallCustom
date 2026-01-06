import { DarkTheme, DefaultTheme, ThemeProvider, Theme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { registerGlobals } from "react-native-webrtc";
import { setAudioModeAsync } from "expo-audio";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import { store, useAppSelector } from "../state/store";
import { useCallEvents } from "../hooks/useCallEvents";
import { SplashScreen } from "../components/SplashScreen";

const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "rgba(0, 122, 255, 1)",
    primaryBackground: "rgba(0, 122, 255, 0.14)",
    background: "rgba(242, 242, 247, 1)",
  },
};

const DarkCustomTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "rgba(0, 136, 255, 1)",
    background: "rgba(44, 44, 46, 1)",
    card: "rgba(28, 28, 30, 1)",
    primaryBackground: "rgba(0, 136, 255, 0.18)",
  },
};

function RootLayoutNav() {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const theme = resolvedScheme === "dark" ? DarkCustomTheme : LightTheme;
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
  fontLoader: {
    flex: 1,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SFProDisplay-Regular": require("../assets/fonts/sf-pro-display/SFPRODISPLAYREGULAR.otf"),
    "SFProDisplay-Medium": require("../assets/fonts/sf-pro-display/SFPRODISPLAYMEDIUM.otf"),
    "SFProDisplay-Bold": require("../assets/fonts/sf-pro-display/SFPRODISPLAYBOLD.otf"),
    "SFProDisplay-BlackItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYBLACKITALIC.otf"),
    "SFProDisplay-HeavyItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYHEAVYITALIC.otf"),
    "SFProDisplay-LightItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYLIGHTITALIC.otf"),
    "SFProDisplay-SemiBoldItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYSEMIBOLDITALIC.otf"),
    "SFProDisplay-ThinItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYTHINITALIC.otf"),
    "SFProDisplay-UltraLightItalic": require("../assets/fonts/sf-pro-display/SFPRODISPLAYULTRALIGHTITALIC.otf"),
  });
  const defaultsSetRef = useRef(false);

  useEffect(() => {
    if (!fontsLoaded || defaultsSetRef.current) return;

    const defaultTextProps = Text.defaultProps ?? {};
    const defaultTextInputProps = TextInput.defaultProps ?? {};

    Text.defaultProps = {
      ...defaultTextProps,
      style: [defaultTextProps.style, { fontFamily: "SFProDisplay-Regular" }],
    };

    TextInput.defaultProps = {
      ...defaultTextInputProps,
      style: [defaultTextInputProps.style, { fontFamily: "SFProDisplay-Regular" }],
    };

    defaultsSetRef.current = true;
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.fontLoader}>
        <SplashScreen />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
    </SafeAreaProvider>
  );
}
