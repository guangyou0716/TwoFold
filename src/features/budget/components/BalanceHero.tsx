import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { BudgetColors, Translator } from "./BudgetColors";
import { BUDGET_LIVE_COLORS } from "./BudgetColors";

export interface BalanceHeroProps {
  colors: BudgetColors;
  isDark: boolean;
  t: Translator;
  filterLabel: string;
  activeCurrency: string;
  remainingBalance: number;
  startingAllowance: number;
  totalIncomes: number;
  totalExpenses: number;
  onEditAllowance: () => void;
}

/**
 * Balance hero + income/expense stats. This is an L2 candidate surface in the
 * Liquid Glass plan; it currently renders the opaque L1 material treatment.
 */
export function BalanceHero({
  colors,
  isDark,
  t,
  filterLabel,
  activeCurrency,
  remainingBalance,
  startingAllowance,
  totalIncomes,
  totalExpenses,
  onEditAllowance,
}: BalanceHeroProps) {
  return (
    <>
      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.balanceLabel, { color: colors.subtitle }]}>
          {t("budgetRemainingPool")} ({filterLabel})
        </Text>
        <Text style={[styles.balanceValue, remainingBalance < 0 && styles.balanceValueNegative]}>
          {activeCurrency}
          {remainingBalance.toFixed(2)}
        </Text>
        <View style={[styles.allowanceRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.allowanceText, { color: colors.subtitle }]}>
            {t("budgetStartingAllowance")}
            {activeCurrency}
            {startingAllowance.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={[
              styles.editAllowanceBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderColor: colors.border,
              },
            ]}
            onPress={onEditAllowance}
          >
            <Text style={[styles.editAllowanceBtnText, { color: colors.subtitle }]}>
              {t("budgetEditBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Column */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statBox,
            { borderLeftColor: BUDGET_LIVE_COLORS.positive, backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statLabel, { color: colors.subtitle }]}>
            {t("budgetIncomes")} ({filterLabel})
          </Text>
          <Text style={styles.statValueIncome}>
            +{activeCurrency}
            {totalIncomes.toFixed(2)}
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            { borderLeftColor: BUDGET_LIVE_COLORS.accent, backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statLabel, { color: colors.subtitle }]}>
            {t("budgetExpenses")} ({filterLabel})
          </Text>
          <Text style={styles.statValueExpense}>
            -{activeCurrency}
            {totalExpenses.toFixed(2)}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: "#131520",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#A0A5C0",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceValue: {
    color: BUDGET_LIVE_COLORS.positive,
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 16,
  },
  balanceValueNegative: { color: BUDGET_LIVE_COLORS.negative },
  allowanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
  },
  allowanceText: {
    color: "#606580",
    fontSize: 13,
    fontWeight: "600",
  },
  editAllowanceBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  editAllowanceBtnText: {
    color: "#A0A5C0",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#A0A5C0",
    fontWeight: "600",
    marginBottom: 4,
  },
  statValueIncome: {
    fontSize: 18,
    fontWeight: "800",
    color: BUDGET_LIVE_COLORS.positive,
  },
  statValueExpense: {
    fontSize: 18,
    fontWeight: "800",
    color: BUDGET_LIVE_COLORS.accent,
  },
});

export default BalanceHero;