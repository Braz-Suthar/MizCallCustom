import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { GestureResponderEvent, Pressable, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Fab({ icon, onPress, style, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon}
      style={[styles.container, { backgroundColor: colors.primary }, style]}
    >
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

