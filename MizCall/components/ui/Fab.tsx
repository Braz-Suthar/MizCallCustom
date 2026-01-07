import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { GestureResponderEvent, Pressable, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";
import { WaveLoader } from "../WaveLoader";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  loading?: boolean;
  disabled?: boolean;
};

export function Fab({ icon, onPress, style, accessibilityLabel, loading, disabled }: Props) {
  const { colors } = useTheme();
  const isDark = colors.background === "#000" || colors.background === "#1a1d29";
  
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon}
      style={[
        styles.container, 
        { backgroundColor: colors.primary }, 
        (loading || disabled) && styles.disabled,
        style
      ]}
      disabled={loading || disabled}
    >
      {loading ? (
        <WaveLoader variant="white" size="small" />
      ) : (
      <Ionicons name={icon} size={24} color="#fff" />
      )}
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
  disabled: {
    opacity: 0.6,
  },
});

