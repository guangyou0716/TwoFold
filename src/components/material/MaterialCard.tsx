import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface MaterialCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Renders nothing visually fancy — just the L1 surface semantics. */
}

/**
 * L1 material surface: reminders, transactions, goals, memories, forms.
 * Opaque fill + hairline border + subtle shadow. NOT blurred.
 */
export function MaterialCard({ children, style }: MaterialCardProps) {
  const { tokens } = useTheme();
  const m = tokens.material;
  return (
    <View
      style={[
        {
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          borderWidth: m.borderWidth,
          borderColor: tokens.colors.border,
          shadowColor: m.shadow,
          shadowOpacity: m.shadowOpacity,
          shadowRadius: m.shadowRadius,
          shadowOffset: m.shadowOffset,
          elevation: m.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default MaterialCard;