import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "./AppText";

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Error + offline + retry surface — replaces silent failures and console-only logs. */
export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  style,
}: ErrorStateProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.root, style]}>
      <AppText variant="bodyEmphasis" color={tokens.colors.danger} style={styles.center}>
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
      {retryLabel && onRetry ? (
        <AppText
          variant="bodyEmphasis"
          color={tokens.colors.accent}
          onPress={onRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          {retryLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  center: { textAlign: "center" },
  retry: { marginTop: 8, fontWeight: "600" },
});

export default ErrorState;