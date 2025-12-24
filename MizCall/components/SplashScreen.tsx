import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

export function SplashScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("../assets/images/splash-icon.png")} style={styles.logo} />
      <Text style={[styles.title, { color: colors.text }]}>MizCall</Text>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 96,
    height: 96,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
});

