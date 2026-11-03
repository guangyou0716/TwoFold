import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import type { Transaction } from "../../../types";
import type { BudgetColors, BudgetLang } from "./BudgetColors";
import { BUDGET_LIVE_COLORS } from "./BudgetColors";

export interface QuickPresetsProps {
  colors: BudgetColors;
  lang: BudgetLang;
  activeCurrency: string;
  presets: Transaction[];
  /** Resolves the preset's category emoji. */
  categoryEmojiFor: (category: string, type: Transaction["type"]) => string;
  onTrigger: (preset: Transaction) => void;
  onDelete: (preset: Transaction) => void;
}

/** Horizontal quick-log hotkeys. Renders nothing when there are no presets. */
export function QuickPresets({
  colors,
  lang,
  activeCurrency,
  presets,
  categoryEmojiFor,
  onTrigger,
  onDelete,
}: QuickPresetsProps) {
  if (presets.length === 0) return null;

  return (
    <View style={styles.presetsContainer}>
      <Text style={[styles.presetsTitle, { color: colors.text }]}>
        {lang === "zh" ? "⚡ 快捷记账 (点击直接记录为今日)" : "⚡ Quick Presets (Tap to log for today)"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}
      >
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.presetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onTrigger(preset)}
            activeOpacity={0.7}
          >
            <View style={styles.presetContent}>
              <Text style={styles.presetEmoji}>
                {categoryEmojiFor(preset.category, preset.type)}
              </Text>
              <View style={styles.presetInfo}>
                <Text style={[styles.presetName, { color: colors.text }]} numberOfLines={1}>
                  {preset.title}
                </Text>
                <Text
                  style={
                    preset.type === "income" ? styles.presetAmountIncome : styles.presetAmountExpense
                  }
                  numberOfLines={1}
                >
                  {preset.type === "income" ? "+" : "-"}
                  {activeCurrency}
                  {preset.amount.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deletePresetBtn}
                onPress={() => onDelete(preset)}
                activeOpacity={0.7}
                accessibilityLabel="Delete preset"
              >
                <Text style={styles.deletePresetBtnText}>×</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  presetsContainer: { marginTop: 12, marginBottom: 20 },
  presetsTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  presetsScroll: { paddingRight: 20 },
  presetCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    minWidth: 145,
  },
  presetContent: { flexDirection: "row", alignItems: "center" },
  presetEmoji: { fontSize: 22, marginRight: 8 },
  presetInfo: { flex: 1, marginRight: 8 },
  presetName: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  presetAmountIncome: { fontSize: 12, fontWeight: "700", color: BUDGET_LIVE_COLORS.positive },
  presetAmountExpense: { fontSize: 12, fontWeight: "700", color: BUDGET_LIVE_COLORS.accent },
  deletePresetBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,59,48,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  deletePresetBtnText: {
    color: BUDGET_LIVE_COLORS.negative,
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
});

export default QuickPresets;