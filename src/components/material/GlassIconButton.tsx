import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { AppIcon } from "../primitives/AppIcon";
import { IconName } from "../../theme/icon-map";
import { useTheme } from "../../theme/useTheme";

export interface GlassIconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  color?: string;
  /** Filled background variant (floating action style). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button with mandatory accessibility label + 44px target. */
export function GlassIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  size = 20,
  color,
  filled = false,
  style,
}: GlassIconButtonProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: Math.max(tokens.touchTarget, size + 24),
          minWidth: Math.max(tokens.touchTarget, size + 24),
          borderRadius: tokens.radius.full,
          backgroundColor: filled ? c.accent : "transparent",
        },
        pressed && !disabled && styles.pressed,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <AppIcon
        name={icon}
        size={size}
        color={color ?? (filled ? c.accentContent : c.text)}
        label={label}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
});

export default GlassIconButton;