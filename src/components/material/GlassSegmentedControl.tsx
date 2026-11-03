import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { AppText } from "../primitives/AppText";
import { useTheme } from "../../theme/useTheme";

export interface GlassSegment<T extends string> {
  value: T;
  label: string;
}

export interface GlassSegmentedControlProps<T extends string> {
  options: GlassSegment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessibility label for the whole control. */
  label: string;
}

/**
 * L2 segmented control. Selection is conveyed by a filled shape AND an accent
 * label — not color alone — with a 44px touch target per segment.
 */
export function GlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: GlassSegmentedControlProps<T>) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: c.surfacePressed,
          borderRadius: tokens.radius.md,
          padding: 3,
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={label}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              { minHeight: tokens.touchTarget - 6, borderRadius: tokens.radius.md - 2 },
              selected && { backgroundColor: c.surface },
              pressed && !selected && styles.pressed,
            ]}
          >
            <AppText
              variant="body"
              color={selected ? c.text : c.textSecondary}
              style={selected && styles.selectedText}
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  selectedText: { fontWeight: "600" },
  pressed: { opacity: 0.7 },
});

export default GlassSegmentedControl;