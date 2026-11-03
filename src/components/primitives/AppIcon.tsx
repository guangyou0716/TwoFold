import React from "react";
import { StyleProp, TextStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColors } from "../../theme/useTheme";
import { IconName, iconMap } from "../../theme/icon-map";

/**
 * Semantic icon. Resolves `name` through the theme's icon map so screens never
 * hardcode a glyph. Always carries an accessibility label for icon-only use.
 */
export type AppIconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Accessibility label; required for icon-only buttons/controls. */
  label?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export function AppIcon({
  name,
  size = 20,
  color,
  label,
  style,
  testID,
}: AppIconProps) {
  const colors = useThemeColors();
  return (
    <Ionicons
      name={iconMap[name]}
      size={size}
      color={color ?? colors.accent}
      style={style}
      testID={testID}
      accessibilityLabel={label}
    />
  );
}

export default AppIcon;