import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Transaction } from "../../../types";
import type { BudgetColors, BudgetLang } from "./BudgetColors";
import { BUDGET_LIVE_COLORS } from "./BudgetColors";

export interface TransactionRowProps {
  colors: BudgetColors;
  isDark: boolean;
  lang: BudgetLang;
  activeCurrency: string;
  currentUserId: string | null;
  item: Transaction;
  /** Pre-computed "💰 Food" style category label. */
  categoryLabel: string;
  onEdit: (item: Transaction) => void;
  onDelete: (item: Transaction) => void;
}

/** A single ledger row (L1 material). Long-press deletes. */
export function TransactionRow({
  colors,
  isDark,
  lang,
  activeCurrency,
  currentUserId,
  item,
  categoryLabel,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const icon = item.type === "income" ? "💰" : categoryLabel.split(" ")[1] ?? "❓";

  return (
    <TouchableOpacity
      style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onEdit(item)}
      onLongPress={() => onDelete(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.txIconBox,
          { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
        ]}
      >
        <Text style={styles.txIcon}>{icon}</Text>
      </View>
      <View style={styles.txMain}>
        <Text style={[styles.txTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.txMeta, { color: colors.subtitle }]}>
          {categoryLabel} ·{" "}
          {item.paidBy === currentUserId
            ? lang === "zh"
              ? "你"
              : "You"
            : lang === "zh"
            ? "伴侣"
            : "Partner"}{" "}
          · {new Date(item.date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
        </Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          item.type === "income" ? styles.txIncomeText : { color: colors.text },
        ]}
      >
        {item.type === "income" ? "+" : "-"}
        {activeCurrency}
        {item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131520",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIcon: { fontSize: 18 },
  txMain: { flex: 1, paddingRight: 8 },
  txTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  txMeta: {
    fontSize: 11,
    color: "#606580",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txIncomeText: {
    color: BUDGET_LIVE_COLORS.positive,
  },
});

export default TransactionRow;