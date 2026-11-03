import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DashboardColors, Translator } from "./DashboardColors";
import { DASH_LIVE_COLORS } from "./DashboardColors";

export interface BudgetSummaryProps {
  colors: DashboardColors;
  t: Translator;
  remainingBalance: number;
  activeCurrency: string;
  activeRemindersCount: number;
}

/** L1 summary grid: shared pool balance + active reminders count. */
export function BudgetSummary({
  colors,
  t,
  remainingBalance,
  activeCurrency,
  activeRemindersCount,
}: BudgetSummaryProps) {
  const balanceColor =
    remainingBalance >= 0 ? DASH_LIVE_COLORS.positive : DASH_LIVE_COLORS.negative;

  return (
    <View style={styles.summaryGrid}>
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.subtitle }]}>
          {t("dashRemainingBalance")}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[styles.summaryValue, { color: balanceColor }]}
        >
          {activeCurrency}
          {remainingBalance.toFixed(2)}
        </Text>
        <Text style={[styles.summarySub, { color: colors.inactiveText }]}>
          {t("dashSharedPoolSub")}
        </Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.subtitle }]}>
          {t("dashRemindersCount")}
        </Text>
        <Text style={[styles.summaryValue, { color: DASH_LIVE_COLORS.accent }]}>
          {activeRemindersCount}
        </Text>
        <Text style={[styles.summarySub, { color: colors.inactiveText }]}>
          {t("dashActiveChecklistsSub")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 2,
  },
  summarySub: {
    fontSize: 10,
  },
});

export default BudgetSummary;