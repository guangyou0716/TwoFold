import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "./AppText";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Themed confirmation dialog. Used for destructive/confirm actions where native
 * Alert styling would clash with the theme. Focus lands on the title when shown.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const confirmColor = destructive ? c.danger : c.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: c.scrim }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderRadius: tokens.radius.lg,
            },
          ]}
        >
          <AppText variant="bodyEmphasis">{title}</AppText>
          {message ? (
            <AppText variant="body" color={c.textSecondary} style={styles.message}>
              {message}
            </AppText>
          ) : null}
          <View style={styles.row}>
            <AppText
              variant="bodyEmphasis"
              color={c.textSecondary}
              onPress={onCancel}
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              {cancelLabel}
            </AppText>
            <AppText
              variant="bodyEmphasis"
              color={confirmColor}
              onPress={onConfirm}
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {confirmLabel}
            </AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    gap: 10,
  },
  message: { marginTop: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 20,
  },
  button: { fontWeight: "600", padding: 6, minHeight: 44, minWidth: 72, textAlign: "center" },
});

export default ConfirmDialog;