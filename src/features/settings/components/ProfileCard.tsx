import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { SettingsColors, Translator } from "./SettingsColors";
import { SETTINGS_LIVE_COLORS } from "./SettingsColors";

export interface ProfileCardProps {
  colors: SettingsColors;
  isDark: boolean;
  t: Translator;
  value: string;
  onChangeText: (v: string) => void;
  onSave: () => void;
  updating: boolean;
}

/** Display-name editor card. */
export function ProfileCard({
  colors,
  isDark,
  t,
  value,
  onChangeText,
  onSave,
  updating,
}: ProfileCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsProfileOptions")}</Text>

      <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsDisplayName")}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={t("authYourName")}
        placeholderTextColor={colors.inactiveText}
        maxLength={30}
      />

      <TouchableOpacity
        style={[styles.submitBtn, updating && styles.disabledBtn]}
        onPress={onSave}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>{t("settingsSaveDisplayName")}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
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

export default ProfileCard;