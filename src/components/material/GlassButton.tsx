import React from "react";
import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { AppText } from "../primitives/AppText";
import { useTheme } from "../../theme/useTheme";

export type GlassButtonVariant = "primary" | "accent" | "surface";

export interface GlassButtonProps {
  label: string;
  onPress?: () => void;
  variant?: GlassButtonVariant;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Primary flattened button (L2-styled) with 44px min target. */
export function GlassButton({
  label,
  onPress,
  variant = "accent",
  disabled = false,
  size = "md",
  loading = false,
  style,
  accessibilityHint,
}: GlassButtonProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  const bg =
    variant === "accent"
      ? c.accent
      : variant === "primary"
      ? c.text
      : c.surfacePressed;

  const fg =
    variant === "accent"
      ? c.accentContent
      : variant === "primary"
      ? c.canvas
      : c.text;

  const pad =
    size === "sm" ? styles.padSm : size === "lg" ? styles.padLg : styles.padMd;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.base,
        pad,
        { backgroundColor: bg, borderRadius: tokens.radius.md, minHeight: tokens.touchTarget },
        pressed && !disabled && styles.pressed,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <AppText variant="caption" color={fg} accessibilityLabel="Loading">
            …
          </AppText>
        ) : null}
        <AppText variant="bodyEmphasis" color={fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pressed: { opacity: 0.85 },
  padSm: { paddingVertical: 6 },
  padMd: { paddingVertical: 12 },
  padLg: { paddingVertical: 16 },
});

export default GlassButton;