import React from "react";
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

type Props = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

export function AppButton({ label, onPress, disabled, loading, variant = "primary", fullWidth }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const content = (
    <View style={[styles.content, isPrimary ? undefined : styles.contentSecondary]}>
      {loading ? <ActivityIndicator color={isPrimary ? "#fff" : colors.text } /> : <Text style={[styles.label, !isPrimary && styles.labelSecondary, !isPrimary && { color: colors.text }]}>{label}</Text>}
    </View>
  );

  if (variant === "ghost") {
    return (
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.ghost,
          fullWidth && styles.fullWidth,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.ghostLabel, { color: colors.primary }]}>{label}</Text>
      </Pressable>
    );
  }

  const baseStyle = [
    styles.pressable,
    isPrimary
      ? [styles.primary, { backgroundColor: colors.primary }]
      : [styles.secondary, { borderColor: colors.border, backgroundColor: colors.card }],
    (disabled || loading) && styles.disabled,
    fullWidth && styles.fullWidth,
  ];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        ...baseStyle,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    borderWidth: 1,
  },
  primary: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  content: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  contentSecondary: {
    backgroundColor: "transparent",
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  labelSecondary: {
  },
  disabled: {
    opacity: 0.6,
  },
  ghost: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  ghostLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});

