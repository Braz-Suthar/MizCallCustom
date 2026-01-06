import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { WaveLoader } from "./WaveLoader";

export function SplashScreen() {
  const { colors } = useTheme();
  const isDark = colors.background === "#000" || colors.background === "#1a1d29";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image 
        source={require("../assets/Icons_and_logos_4x/wave_logo.png")} 
        style={styles.logo} 
      />
      <Text style={[styles.title, { color: colors.text }]}>MizCall</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Fast, secure calls and recordings
      </Text>
      <View style={styles.loaderContainer}>
        <WaveLoader 
          variant={isDark ? "white" : "primary"} 
          size="large" 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 20,
  },
  loaderContainer: {
    marginTop: 12,
  },
});

