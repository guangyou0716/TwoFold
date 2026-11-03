import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";

export type AppTextVariant = "caption" | "body" | "bodyEmphasis" | "title" | "headline" | "display";

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string;
}

/**
 * Thematically-scoped text. Uses the design tokens instead of per-screen hex
 * colors, and supports Dynamic Type naturally via RN <Text>.
 */
export function AppText({
  variant = "body",
  color,
  style,
  ...rest
}: AppTextProps) {
  const { tokens } = useTheme();
  const type = tokens.type;
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: type[variant],
          color: color ?? tokens.colors.text,
          includeFontPadding: false,
        },
        variant === "display" && styles.displayLineHeight,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  displayLineHeight: { lineHeight: 44 },
});

export default AppText;