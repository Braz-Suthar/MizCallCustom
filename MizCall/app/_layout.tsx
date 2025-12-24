import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

import { store, useAppSelector } from "../state/store";
import { useCallEvents } from "../hooks/useCallEvents";

function RootLayoutNav() {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const systemScheme = useColorScheme() ?? "light";
  const resolvedScheme = themeMode === "system" ? systemScheme : themeMode;
  const theme = resolvedScheme === "dark" ? DarkTheme : DefaultTheme;
  useCallEvents();

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
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
