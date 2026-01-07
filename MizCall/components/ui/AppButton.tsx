import React from "react";
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

type Props = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, onPress, disabled, loading, variant = "primary", fullWidth, size = "md", style }: Props) {
  const { colors } = useTheme();
  const primaryColor = colors.primary ?? "#3c82f6";
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const verticalPadding = size === "sm" ? 10 : 14;
  const fontSize = size === "sm" ? 14 : 16;
  const content = (
    <View style={[styles.content, isPrimary ? undefined : styles.contentSecondary]}>
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? "#fff" : colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            { fontSize },
            !isPrimary && !isDanger && styles.labelSecondary,
            !isPrimary && !isDanger && { color: colors.text },
          ]}
        >
          {label}
        </Text>
      )}
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
          style,
        ]}
      >
        <Text style={[styles.ghostLabel, { color: primaryColor }]}>{label}</Text>
      </Pressable>
    );
  }

  const baseStyle = [
    styles.pressable,
    { paddingVertical: verticalPadding },
    isPrimary
      ? [styles.primary, { backgroundColor: primaryColor }]
      : isDanger
      ? [styles.danger]
      : [styles.secondary, { borderColor: colors.border, backgroundColor: colors.card }],
    (disabled || loading) && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
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
  danger: {
    backgroundColor: "#ef4444",
    shadowColor: "#b91c1c",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

