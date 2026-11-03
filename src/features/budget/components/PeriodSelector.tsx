import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { BudgetColors, BudgetFilter, Translator } from "./BudgetColors";
import { BUDGET_LIVE_COLORS } from "./BudgetColors";

export interface PeriodSelectorProps {
  colors: BudgetColors;
  t: Translator;
  budgetFilter: BudgetFilter;
  filterLabel: string;
  onFilterChange: (filter: BudgetFilter) => void;
  onAddTransaction: () => void;
  onOpenDatePicker: () => void;
}

/**
 * Ledger header + period segmented control (an L2 candidate in the plan) and the
 * custom reference-period trigger.
 */
export function PeriodSelector({
  colors,
  t,
  budgetFilter,
  filterLabel,
  onFilterChange,
  onAddTransaction,
  onOpenDatePicker,
}: PeriodSelectorProps) {
  const tabs: { value: BudgetFilter; label: string }[] = [
    { value: "all", label: t("budgetTabAll") },
    { value: "daily", label: t("budgetTabToday") },
    { value: "monthly", label: t("budgetTabMonth") },
    { value: "yearly", label: t("budgetTabYear") },
  ];

  return (
    <>
      {/* Ledger Headers */}
      <View style={styles.ledgerHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("budgetTransactionLog")}</Text>
        <TouchableOpacity style={styles.addTransBtn} onPress={onAddTransaction}>
          <Text style={styles.addTransText}>{t("budgetAddBillBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tab Selector */}
      <View
        style={[
          styles.filterTabContainer,
          { backgroundColor: colors.tabBackground, borderColor: colors.border },
        ]}
      >
        {tabs.map((tab) => {
          const active = budgetFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterTabButton, active && styles.filterTabButtonActive]}
              onPress={() => onFilterChange(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.filterTabButtonText,
                  active && styles.filterTabButtonTextActive,
                  { color: active ? "#FFFFFF" : colors.inactiveText },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {budgetFilter !== "all" && (
        <TouchableOpacity
          style={[
            styles.customFilterTrigger,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
          onPress={onOpenDatePicker}
          activeOpacity={0.7}
        >
          <Text style={[styles.customFilterTriggerText, { color: colors.text }]}>
            {t("budgetReferencePeriod")}
            <Text style={styles.customFilterValue}>{filterLabel}</Text> ✏️
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  ledgerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addTransBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addTransText: {
    color: BUDGET_LIVE_COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTabContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  filterTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  filterTabButtonActive: {
    backgroundColor: BUDGET_LIVE_COLORS.accent,
  },
  filterTabButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterTabButtonTextActive: {
    color: "#FFFFFF",
  },
  customFilterTrigger: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  customFilterTriggerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  customFilterValue: { color: BUDGET_LIVE_COLORS.accent, fontWeight: "700" },
});

export default PeriodSelector;