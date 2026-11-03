import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { DashboardColors, DashboardLang, Translator } from "./DashboardColors";

export interface NudgeBarProps {
  colors: DashboardColors;
  lang: DashboardLang;
  t: Translator;
  onSend: (payload: string) => void;
}

/** Playful partner-nudge grid. Payloads mirror the historical emoji labels. */
export function NudgeBar({ colors, lang, t, onSend }: NudgeBarProps) {
  const nudges: { emoji: string; payload: string; zh: string; en: string }[] = [
    { emoji: "❤️", payload: "❤️ Hug", zh: "拥抱", en: "Hug" },
    { emoji: "🔔", payload: "🔔 Poke", zh: "戳一戳", en: "Poke" },
    { emoji: "☕", payload: "☕ Coffee", zh: "喝咖啡？", en: "Coffee?" },
    { emoji: "🌙", payload: "🌙 Miss you", zh: "想你啦", en: "Miss You" },
  ];

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashSendNudge")}</Text>
      <View style={styles.row}>
        {nudges.map((n) => (
          <TouchableOpacity
            key={n.payload}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onSend(n.payload)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{n.emoji}</Text>
            <Text style={[styles.label, { color: colors.subtitle }]}>
              {lang === "zh" ? n.zh : n.en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  emoji: { fontSize: 20, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "600" },
});

export default NudgeBar;