import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { SettingsColors, Translator } from "./SettingsColors";
import { SETTINGS_LIVE_COLORS } from "./SettingsColors";

export interface PasswordCardProps {
  colors: SettingsColors;
  isDark: boolean;
  t: Translator;
  open: boolean;
  onToggle: () => void;
  newPassword: string;
  onChangeNewPassword: (v: string) => void;
  confirmPassword: string;
  onChangeConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  updating: boolean;
}

/** Collapsible change-password card. */
export function PasswordCard({
  colors,
  isDark,
  t,
  open,
  onToggle,
  newPassword,
  onChangeNewPassword,
  confirmPassword,
  onChangeConfirmPassword,
  onSubmit,
  updating,
}: PasswordCardProps) {
  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      color: colors.text,
      borderColor: colors.border,
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
          {t("settingsChangePassword")}
        </Text>
        <Text style={{ color: colors.subtitle, fontSize: 16 }}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsNewPassword")}</Text>
          <TextInput
            style={inputStyle}
            value={newPassword}
            onChangeText={onChangeNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.inactiveText}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.subtitle, marginTop: 12 }]}>
            {t("settingsConfirmPassword")}
          </Text>
          <TextInput
            style={inputStyle}
            value={confirmPassword}
            onChangeText={onChangeConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.inactiveText}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.submitBtn, updating && styles.disabledBtn, { marginTop: 16 }]}
            onPress={onSubmit}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t("settingsUpdatePasswordBtn")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: { marginTop: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: SETTINGS_LIVE_COLORS.accent,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabledBtn: { opacity: 0.6 },
});

export default PasswordCard;