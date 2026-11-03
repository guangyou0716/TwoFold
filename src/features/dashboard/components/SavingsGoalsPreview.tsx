import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { SavingsGoal } from "../../../types";
import type { DashboardColors, DashboardLang } from "./DashboardColors";
import { DASH_LIVE_COLORS } from "./DashboardColors";

export interface SavingsGoalsPreviewProps {
  colors: DashboardColors;
  lang: DashboardLang;
  activeCurrency: string;
  goals: SavingsGoal[];
}

/** L1 savings-goals progress list shown on the dashboard. */
export function SavingsGoalsPreview({
  colors,
  lang,
  activeCurrency,
  goals,
}: SavingsGoalsPreviewProps) {
  if (goals.length === 0) return null;

  return (
    <View style={styles.widget}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12, marginBottom: 12 }]}>
        {lang === "zh" ? "🐷 储蓄目标进度" : "🐷 Savings Goals Progress"}
      </Text>
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
        const progressColor =
          progressPercent >= 100 ? DASH_LIVE_COLORS.positive : DASH_LIVE_COLORS.accent;

        return (
          <View
            key={goal.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>🐷 {goal.title}</Text>
              <Text style={[styles.progressText, { color: progressColor }]}>
                {activeCurrency}
                {goal.currentAmount.toFixed(0)} / {activeCurrency}
                {goal.targetAmount.toFixed(0)} ({progressPercent}%)
              </Text>
            </View>

            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${progressPercent}%`, backgroundColor: progressColor },
                ]}
              />
            </View>

            <View style={styles.footerRow}>
              {goal.targetDate ? (
                <Text style={styles.dateText}>
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
                <Text style={styles.dateText}>
                  📅 {lang === "zh" ? "无截止日期" : "No deadline"}
                </Text>
              )}
              {progressPercent >= 100 && (
                <Text style={styles.completedLabel}>
                  🎉 {lang === "zh" ? "已达成！" : "Completed!"}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  widget: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 10 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: "800" },
  progressText: { fontSize: 13, fontWeight: "700" },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    marginBottom: 10,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: 11, color: "#8085A0" },
  completedLabel: { fontSize: 11, fontWeight: "700", color: DASH_LIVE_COLORS.positive },
});

export default SavingsGoalsPreview;