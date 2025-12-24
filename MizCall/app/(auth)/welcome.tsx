import { Link } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { AppButton } from "../../components/ui/AppButton";

export default function Welcome() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
      <Text style={[styles.title, { color: colors.text }]}>Welcome to MizCall</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Fast, secure calls and recordings with an iOS-polished feel.</Text>

      <View style={styles.actions}>
        <Link href="/(auth)/login" asChild>
          <AppButton label="Log in" onPress={() => {}} />
        </Link>
        <Link href="/(auth)/register" asChild>
          <AppButton label="Create account" variant="secondary" onPress={() => {}} />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: 12,
    marginTop: 20,
  },
});

