import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import type { SavingsGoal } from "../../../types";
import type { BudgetColors, BudgetLang } from "./BudgetColors";
import { BUDGET_LIVE_COLORS } from "./BudgetColors";

export interface SavingsGoalCarouselProps {
  colors: BudgetColors;
  lang: BudgetLang;
  activeCurrency: string;
  goals: SavingsGoal[];
  /** Open the goal editor (undefined = create new). */
  onOpenGoal: (goal?: SavingsGoal) => void;
  /** Deposit/withdraw from a goal. */
  onFund: (goal: SavingsGoal, action: "add" | "deduct") => void;
}

/** Horizontal savings-goal cards with progress + fund actions. */
export function SavingsGoalCarousel({
  colors,
  lang,
  activeCurrency,
  goals,
  onOpenGoal,
  onFund,
}: SavingsGoalCarouselProps) {
  return (
    <View style={styles.savingsSection}>
      <View style={styles.savingsHeader}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
          {lang === "zh" ? "🐷 储蓄目标 (Savings Goals)" : "🐷 Savings Goals"}
        </Text>
        <TouchableOpacity onPress={() => onOpenGoal()}>
          <Text style={styles.newGoalLink}>
            {lang === "zh" ? "+ 新建目标" : "+ New Goal"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {goals.map((goal) => {
          const progressPercent = Math.min(
            100,
            Math.round((goal.currentAmount / goal.targetAmount) * 100)
          );
          const daysLeft = goal.targetDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(goal.targetDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : null;

          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onOpenGoal(goal)}
              activeOpacity={0.8}
            >
              <View style={styles.goalCardTop}>
                <Text style={styles.goalEmoji}>🐷</Text>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  <Text style={[styles.goalTargetText, { color: colors.subtitle }]}>
                    {lang === "zh" ? "目标金额：" : "Target: "}
                    {activeCurrency}
                    {goal.targetAmount.toFixed(0)}
                  </Text>
                </View>
              </View>

              <View style={styles.goalProgressRow}>
                <Text style={[styles.goalSavedText, { color: colors.text }]}>
                  {activeCurrency}
                  {goal.currentAmount.toFixed(0)} ({progressPercent}%)
                </Text>
              </View>

              <View style={styles.goalProgressBarBg}>
                <View
                  style={[
                    styles.goalProgressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent >= 100 ? BUDGET_LIVE_COLORS.positive : BUDGET_LIVE_COLORS.accent,
                    },
                  ]}
                />
              </View>

              {goal.targetDate ? (
                <Text style={styles.goalDateText}>
                  📅 {new Date(goal.targetDate).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")} (
                  {daysLeft !== null && daysLeft > 0
                    ? lang === "zh"
                      ? `还剩 ${daysLeft} 天`
                      : `${daysLeft} days left`
                    : lang === "zh"
                    ? "已到期"
                    : "Due"}
                  )
                </Text>
              ) : (
                <Text style={styles.goalDateText}>
                  📅 {lang === "zh" ? "无截止日期" : "No deadline"}
                </Text>
              )}

              <View style={styles.goalActionButtons}>
                <TouchableOpacity
                  style={[styles.goalFundBtn, styles.goalFundBtnAdd]}
                  onPress={() => onFund(goal, "add")}
                >
                  <Text style={styles.goalFundBtnText}>{lang === "zh" ? "存钱" : "Save"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalFundBtn,
                    { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => onFund(goal, "deduct")}
                >
                  <Text style={[styles.goalFundBtnText, { color: colors.text }]}>
                    {lang === "zh" ? "取钱" : "Withdraw"}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Dotted Card for Creating Savings Goal */}
        <TouchableOpacity
          style={[
            styles.goalCard,
            { borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center" },
          ]}
          onPress={() => onOpenGoal()}
          activeOpacity={0.7}
        >
          <Text style={styles.newGoalEmoji}>🐷</Text>
          <Text style={styles.newGoalText}>
            {lang === "zh" ? "+ 新建储蓄目标" : "+ New Savings Goal"}
          </Text>
          <Text style={[styles.newGoalSub, { color: colors.subtitle }]}>
            {lang === "zh" ? "自动平衡日常记账" : "Balance daily budgets"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  savingsSection: { marginTop: 8, marginBottom: 20 },
  savingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  newGoalLink: { color: BUDGET_LIVE_COLORS.accent, fontSize: 13, fontWeight: "700" },
  scroll: { paddingRight: 20 },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginRight: 12,
    width: 220,
    minHeight: 180,
  },
  goalCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  goalEmoji: { fontSize: 28, marginRight: 10 },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  goalTargetText: { fontSize: 11 },
  goalProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  goalSavedText: { fontSize: 13, fontWeight: "700" },
  goalProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    marginBottom: 10,
    overflow: "hidden",
  },
  goalProgressBarFill: { height: "100%", borderRadius: 3 },
  goalDateText: { fontSize: 10, color: "#8085A0", marginBottom: 12 },
  goalActionButtons: { flexDirection: "row", gap: 8 },
  goalFundBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  goalFundBtnAdd: { backgroundColor: BUDGET_LIVE_COLORS.accent },
  goalFundBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  newGoalEmoji: { fontSize: 32, marginBottom: 8 },
  newGoalText: { fontSize: 14, fontWeight: "700", color: BUDGET_LIVE_COLORS.accent },
  newGoalSub: { fontSize: 11, textAlign: "center", marginTop: 4, paddingHorizontal: 12 },
});

export default SavingsGoalCarousel;