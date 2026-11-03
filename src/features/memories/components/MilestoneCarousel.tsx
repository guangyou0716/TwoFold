import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import type { Milestone } from "../../../types";
import type { MemoryColors, Translator } from "./MemoryColors";
import { MEMORY_LIVE_COLORS } from "./MemoryColors";

export interface MilestoneValues {
  countText: string;
  labelText: string;
}

export interface MilestoneCarouselProps {
  colors: MemoryColors;
  t: Translator;
  milestones: Milestone[];
  activeMilestoneId: string | null;
  /** Pre-computed countdown/count-up values for a milestone. */
  valuesFor: (m: Milestone) => MilestoneValues;
  onSelect: (id: string) => void;
  onEdit: (m: Milestone) => void;
  onAdd: () => void;
}

/** Milestone header row + horizontal countdown cards. */
export function MilestoneCarousel({
  colors,
  t,
  milestones,
  activeMilestoneId,
  valuesFor,
  onSelect,
  onEdit,
  onAdd,
}: MilestoneCarouselProps) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("memOurMilestones")}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>{t("memAddBtn")}</Text>
        </TouchableOpacity>
      </View>

      {milestones.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>{t("memNoMilestonesTitle")}</Text>
          <Text style={[styles.emptySub, { color: colors.subtitle }]}>
            {t("memNoMilestonesSub")}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.milestoneScroll}
            nestedScrollEnabled
          >
            {milestones.map((item) => {
              const isActive = activeMilestoneId === item.id;
              const { countText, labelText } = valuesFor(item);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.milestoneCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && styles.activeMilestoneCard,
                  ]}
                  onPress={() => onSelect(item.id)}
                  onLongPress={() => onEdit(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={item.title}
                >
                  <Text
                    style={[
                      styles.mCardTitle,
                      { color: colors.subtitle },
                      isActive && styles.mCardTitleActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    style={[styles.mDaysCount, { color: colors.text }]}
                  >
                    {countText}
                  </Text>
                  {labelText ? (
                    <Text style={[styles.mDaysLabel, { color: colors.inactiveText }]}>{labelText}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.longPressHint}>{t("memLongPressHint")}</Text>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  addBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addBtnText: { color: MEMORY_LIVE_COLORS.accent, fontSize: 12, fontWeight: "700" },
  emptyCard: {
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: "#A0A5C0", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  emptySub: { color: "#606580", fontSize: 12, textAlign: "center", lineHeight: 16 },
  milestoneScroll: { gap: 12, paddingRight: 20 },
  milestoneCard: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    width: 140,
    minHeight: 120,
    justifyContent: "center",
  },
  activeMilestoneCard: {
    borderColor: MEMORY_LIVE_COLORS.accent,
    backgroundColor: "rgba(255,94,126,0.07)",
  },
  mCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A5C0",
    textAlign: "center",
    marginBottom: 8,
  },
  mCardTitleActive: { color: MEMORY_LIVE_COLORS.accent },
  mDaysCount: { fontSize: 30, fontWeight: "900", color: "#FFFFFF" },
  mDaysLabel: { fontSize: 10, color: "#606580", marginTop: 4, fontWeight: "600" },
  longPressHint: { fontSize: 11, color: "#606580", textAlign: "center", marginTop: 8 },
});

export default MilestoneCarousel;