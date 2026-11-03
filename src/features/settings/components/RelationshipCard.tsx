import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { SettingsColors, Translator } from "./SettingsColors";
import { SETTINGS_LIVE_COLORS } from "./SettingsColors";

export interface RelationshipCardProps {
  colors: SettingsColors;
  t: Translator;
  isSolo: boolean;
  partnerName: string | null;
  onUnlink: () => void;
  updating: boolean;
}

/** Pairing status + unlink action. */
export function RelationshipCard({
  colors,
  t,
  isSolo,
  partnerName,
  onUnlink,
  updating,
}: RelationshipCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsRelationshipStatus")}</Text>
      {isSolo ? (
        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: colors.text }]}>{t("settingsSoloActive")}</Text>
          <Text style={[styles.statusSubText, { color: colors.subtitle }]}>
            {t("settingsSoloSub")}
          </Text>
        </View>
      ) : (
        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {t("settingsConnectedWithPartner")}
            {partnerName ?? "Your Partner"}
          </Text>
          <Text style={[styles.statusSubText, { color: colors.subtitle }]}>
            {t("settingsConnectedSub")}
          </Text>
          <TouchableOpacity style={styles.unlinkBtn} onPress={onUnlink} disabled={updating}>
            <Text style={styles.unlinkBtnText}>{t("settingsUnlinkBtn")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  statusBox: { marginTop: 4 },
  statusText: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  statusSubText: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  unlinkBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.2)",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unlinkBtnText: { color: SETTINGS_LIVE_COLORS.danger, fontSize: 13, fontWeight: "700" },
});

export default RelationshipCard;