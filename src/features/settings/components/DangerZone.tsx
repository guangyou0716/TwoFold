import React from "react";
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { SettingsColors, SettingsLang, Translator } from "./SettingsColors";
import { SETTINGS_LIVE_COLORS } from "./SettingsColors";

export interface DangerZoneProps {
  colors: SettingsColors;
  isDark: boolean;
  t: Translator;
  lang: SettingsLang;
  updating: boolean;
  onLogout: () => void;
  onExport: () => void;
  onDelete: () => void;
  onOpenPolicy: () => void;
}

/** Logout, data export, account deletion and policy entry points. */
export function DangerZone({
  colors,
  isDark,
  t,
  lang,
  updating,
  onLogout,
  onExport,
  onDelete,
  onOpenPolicy,
}: DangerZoneProps) {
  return (
    <>
      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>{t("settingsLogoutBtn")}</Text>
      </TouchableOpacity>

      {/* Export Personal Data (GDPR Compliance) */}
      <TouchableOpacity
        style={[styles.exportDataBtn, { borderColor: colors.border }]}
        onPress={onExport}
        disabled={updating}
      >
        <Text style={[styles.exportDataBtnText, { color: colors.subtitle }]}>
          {t("settingsExportDataBtn")}
        </Text>
      </TouchableOpacity>

      {/* Delete Account (Apple Compliance) */}
      <TouchableOpacity
        style={[
          styles.deleteAccountBtn,
          { borderColor: isDark ? "rgba(255,59,48,0.15)" : "rgba(255,59,48,0.1)" },
        ]}
        onPress={onDelete}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator color={SETTINGS_LIVE_COLORS.danger} size="small" />
        ) : (
          <Text style={styles.deleteAccountBtnText}>
            {lang === "zh" ? "⚠️ 永久注销账户" : "⚠️ Permanently Delete Account"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Privacy Policy Recap */}
      <TouchableOpacity
        style={[styles.policyBtn, { borderColor: colors.border }]}
        onPress={onOpenPolicy}
      >
        <Text style={[styles.policyBtnText, { color: colors.subtitle }]}>
          {lang === "zh" ? "📄 查看服务条款 & 隐私政策" : "📄 View Terms & Privacy Policy"}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  logoutBtnText: { color: SETTINGS_LIVE_COLORS.danger, fontSize: 14, fontWeight: "700" },
  exportDataBtn: {
    height: 52,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  exportDataBtnText: { fontSize: 14, fontWeight: "700" },
  deleteAccountBtn: {
    height: 52,
    borderWidth: 1,
    backgroundColor: "rgba(255, 59, 48, 0.03)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  deleteAccountBtnText: { color: SETTINGS_LIVE_COLORS.danger, fontSize: 14, fontWeight: "700" },
  policyBtn: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  policyBtnText: { fontSize: 13, fontWeight: "600" },
});

export default DangerZone;