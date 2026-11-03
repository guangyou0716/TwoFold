import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Transaction } from "../../../types";
import type { BudgetColors, BudgetLang, Translator } from "./BudgetColors";
import { TransactionRow } from "./TransactionRow";

export interface TransactionLedgerProps {
  colors: BudgetColors;
  isDark: boolean;
  lang: BudgetLang;
  t: Translator;
  activeCurrency: string;
  currentUserId: string | null;
  transactions: Transaction[];
  categoryLabelFor: (category: string) => string;
  onEdit: (item: Transaction) => void;
  onDelete: (item: Transaction) => void;
}

/** Ledger list with its empty state and long-press hint. */
export function TransactionLedger({
  colors,
  isDark,
  lang,
  t,
  activeCurrency,
  currentUserId,
  transactions,
  categoryLabelFor,
  onEdit,
  onDelete,
}: TransactionLedgerProps) {
  if (transactions.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.emptyEmoji}>💳</Text>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t("budgetNoTransactionsTitle")}</Text>
        <Text style={[styles.emptySubText, { color: colors.subtitle }]}>
          {t("budgetNoTransactionsSub")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.transactionsList}>
      {transactions.map((item) => (
        <TransactionRow
          key={item.id}
          colors={colors}
          isDark={isDark}
          lang={lang}
          activeCurrency={activeCurrency}
          currentUserId={currentUserId}
          item={item}
          categoryLabel={categoryLabelFor(item.category)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      <Text style={[styles.longPressHint, { color: colors.inactiveText }]}>{t("budgetHint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubText: {
    color: "#606580",
    fontSize: 13,
    textAlign: "center",
  },
  transactionsList: { gap: 12 },
  longPressHint: {
    fontSize: 11,
    color: "#606580",
    textAlign: "center",
    marginTop: 8,
  },
});

export default TransactionLedger;