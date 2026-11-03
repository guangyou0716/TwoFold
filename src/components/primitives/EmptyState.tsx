import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "./AppText";
import { AppIcon } from "./AppIcon";
import { IconName } from "../../theme/icon-map";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Neutral empty state — replaces blank whitespace on lists/feeds. */
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: tokens.colors.surface },
        ]}
      >
        <AppIcon name={icon} size={32} color={tokens.colors.textTertiary} />
      </View>
      <AppText variant="bodyEmphasis" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText
          variant="body"
          color={tokens.colors.textSecondary}
          style={styles.center}
        >
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppText
          variant="bodyEmphasis"
          color={tokens.colors.accent}
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {actionLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  action: { marginTop: 8, fontWeight: "600" },
});

export default EmptyState;