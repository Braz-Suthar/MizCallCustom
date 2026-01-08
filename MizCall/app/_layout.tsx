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
  Pressable,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { registerGlobals } from "react-native-webrtc";
import { setAudioModeAsync } from "expo-audio";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { store, useAppSelector } from "../state/store";
import { SplashScreen } from "../components/SplashScreen";

const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#3c82f6",
    primaryBackground: "rgba(60, 130, 246, 0.14)",
    background: "#f3f4f6",
    card: "#ffffff",
  },
};

const DarkCustomTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#3c82f6",
    background: "#101827",
    card: "#1f2937",
    primaryBackground: "rgba(60, 130, 246, 0.18)",
  },
};

function RootLayoutNav() {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const theme = resolvedScheme === "dark" ? DarkCustomTheme : LightTheme;
  const [lockRequired, setLockRequired] = useState(false);
  const [lockVerified, setLockVerified] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [authing, setAuthing] = useState(false);
  
  // useCallEvents removed - socketManager handles all connections now
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

  const attemptLockAuth = useCallback(async () => {
    setAuthing(true);
    setLockError(null);
    try {
      // Dynamic import to avoid native module errors when not installed
      const LocalAuthenticationModule: any = await import("expo-local-authentication");
      const LocalAuthentication =
        (LocalAuthenticationModule as any).default ?? LocalAuthenticationModule;
      if (!LocalAuthentication?.hasHardwareAsync) {
        setLockError("Device lock is unavailable on this device.");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setLockError("Device lock is not set up. Enable Face/Touch ID or passcode.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock MizCall",
        fallbackLabel: "Use device passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLockVerified(true);
        setLockRequired(false);
      } else {
        setLockError("Authentication required to continue.");
      }
    } catch (e) {
      console.warn("[app/_layout] Device lock auth failed", e);
      setLockError("Could not authenticate. Please try again.");
    } finally {
      setAuthing(false);
      setLockChecked(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkLock = async () => {
      try {
        const enabled = await AsyncStorage.getItem("deviceLockEnabled");
        if (enabled === "true") {
          if (!mounted) return;
          setLockRequired(true);
          await attemptLockAuth();
        } else {
          if (!mounted) return;
          setLockVerified(true);
        }
      } catch (e) {
        console.warn("[app/_layout] Failed to check device lock", e);
        if (mounted) setLockVerified(true);
      } finally {
        if (mounted) setLockChecked(true);
      }
    };
    checkLock();
    return () => {
      mounted = false;
    };
  }, [attemptLockAuth]);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      {lockRequired && !lockVerified ? (
        <View
          style={[
            styles.lockScreen,
            { backgroundColor: theme.colors.background, paddingHorizontal: 24 },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={48}
            color={theme.colors.primary}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.lockTitle, { color: theme.colors.text }]}>Unlock required</Text>
          <Text style={[styles.lockSubtitle, { color: theme.colors.text }]}>
            {lockError ??
              "Use your device Face/Touch ID or passcode to access MizCall."}
          </Text>
          <Pressable
            style={[
              styles.lockButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: authing ? 0.7 : 1,
              },
            ]}
            disabled={authing}
            onPress={attemptLockAuth}
          >
            <Text style={styles.lockButtonText}>{authing ? "Authenticating…" : "Unlock"}</Text>
          </Pressable>
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: Platform.OS === "ios" ? styles.iosContainer : undefined,
          }}
        />
      )}
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
  lockScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    marginBottom: 12,
  },
  lockButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 180,
    alignItems: "center",
  },
  lockButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
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
