import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle, AccessibilityState } from "react-native";
import { AppIcon } from "../primitives/AppIcon";
import { IconName } from "../../theme/icon-map";
import { LiquidGlassSurface } from "./LiquidGlassSurface";
import { useTheme } from "../../theme/useTheme";

export interface GlassFloatingActionProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Floating primary action (add / scan) — L2 glass, 56px target. */
export function GlassFloatingAction({
  icon,
  label,
  onPress,
  disabled = false,
  style,
}: GlassFloatingActionProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  return (
    <LiquidGlassSurface
      style={[
        styles.wrap,
        { borderRadius: tokens.radius.full, shadowColor: "#000" },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled } as AccessibilityState}
        style={({ pressed }) => [
          styles.button,
          { borderRadius: tokens.radius.full, minHeight: 56, minWidth: 56 },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <AppIcon name={icon} size={26} color={c.accentContent} label={label} />
      </Pressable>
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "visible" },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});

export default GlassFloatingAction;