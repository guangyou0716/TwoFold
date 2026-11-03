import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Milestone } from "../../../types";
import type { DashboardColors, DashboardLang } from "./DashboardColors";

export interface MilestoneHeroProps {
  colors: DashboardColors;
  lang: DashboardLang;
  /** Null renders the empty "tap to select" state. */
  milestone: Milestone | null;
  /** Pre-computed label ("12 days to go" / "3 years together"…). */
  label: string | null;
  onPress: () => void;
}

/** L1 featured-milestone hero with countdown/anniversary label. */
export function MilestoneHero({
  colors,
  lang,
  milestone,
  label,
  onPress,
}: MilestoneHeroProps) {
  if (!milestone) {
    return (
      <TouchableOpacity
        style={[
          styles.milestoneCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 20,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.milestoneTitle, { color: colors.subtitle, textAlign: "center" }]}>
          {lang === "zh" ? "💖 点击选择纪念日 / 里程碑倒计时" : "💖 Tap to Select Anniversary / Milestone Countdown"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.milestoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.milestoneIconRow}>
        <Text style={styles.milestoneEmoji}>💖</Text>
        <View style={styles.milestoneBody}>
          <View style={styles.milestoneTitleRow}>
            <Text style={[styles.milestoneTitle, { color: colors.text }]}>{milestone.title}</Text>
            <Text style={styles.milestoneEditIcon}>✏️</Text>
          </View>
          <Text style={[styles.milestoneMeta, { color: colors.subtitle }]}>
            {new Date(milestone.date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.milestoneBadge}>
          <Text style={styles.milestoneBadgeText}>{label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  milestoneCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  milestoneIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  milestoneBody: { flex: 1 },
  milestoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  milestoneEmoji: {
    fontSize: 28,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  milestoneEditIcon: { fontSize: 12 },
  milestoneMeta: {
    fontSize: 11,
  },
  milestoneBadge: {
    backgroundColor: "rgba(255,94,126,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  milestoneBadgeText: {
    color: "#FF5E7E",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default MilestoneHero;