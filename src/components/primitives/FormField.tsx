import React from "react";
import { View, StyleSheet, TextInput, TextInputProps, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { AppText } from "./AppText";

export interface FormFieldProps extends TextInputProps {
  label?: string;
  /** Text shown under the field on error. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Themed labelled text input with error surface. */
export function FormField({
  label,
  error,
  containerStyle,
  placeholderTextColor,
  style,
  ...rest
}: FormFieldProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  return (
    <View style={[styles.root, containerStyle]}>
      {label ? (
        <AppText variant="caption" color={c.textSecondary} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={placeholderTextColor ?? c.textTertiary}
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderRadius: tokens.radius.md,
            borderColor: error ? c.danger : c.border,
            color: c.text,
            fontSize: tokens.type.body,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color={c.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  label: { marginLeft: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { marginLeft: 4 },
});

export default FormField;