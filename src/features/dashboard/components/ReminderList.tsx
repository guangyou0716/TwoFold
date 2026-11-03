import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Task } from "../../../types";
import type { DashboardColors, DashboardLang, Translator } from "./DashboardColors";

export type ReminderTab = "active" | "history";

export interface ReminderListProps {
  colors: DashboardColors;
  lang: DashboardLang;
  t: Translator;
  activeTab: ReminderTab;
  pendingTasks: Task[];
  completedTasks: Task[];
  currentUserId: string | null;
  onTabChange: (tab: ReminderTab) => void;
  onAddReminder: () => void;
  /** Opens the edit modal pre-populated for this task. */
  onOpenTask: (item: Task) => void;
  onCompleteTask: (item: Task) => void;
  onRestoreTask: (item: Task) => void;
}

/** Active/history reminder lists with tab selector, empty states and restore. */
export function ReminderList({
  colors,
  lang,
  t,
  activeTab,
  pendingTasks,
  completedTasks,
  currentUserId,
  onTabChange,
  onAddReminder,
  onOpenTask,
  onCompleteTask,
  onRestoreTask,
}: ReminderListProps) {
  const recurrenceLabel = (r: Task["recurrence"]) =>
    r === "daily"
      ? lang === "zh"
        ? "每天"
        : "Daily"
      : r === "weekly"
      ? lang === "zh"
        ? "每周"
        : "Weekly"
      : lang === "zh"
      ? "每月"
      : "Monthly";

  return (
    <>
      {/* Reminders / Chores Section Headers */}
      <View style={styles.choresHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashRemindersChores")}</Text>
        <TouchableOpacity style={styles.addTaskBtn} onPress={onAddReminder}>
          <Text style={styles.addTaskText}>{t("dashAddReminderBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* Reminders Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.tabBackground, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]}
          onPress={() => onTabChange("active")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "active" }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "active" && styles.tabButtonTextActive,
              { color: activeTab === "active" ? "#FFFFFF" : colors.inactiveText },
            ]}
          >
            {t("dashTabActive")} ({pendingTasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
          onPress={() => onTabChange("history")}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "history" }}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "history" && styles.tabButtonTextActive,
              { color: activeTab === "history" ? "#FFFFFF" : colors.inactiveText },
            ]}
          >
            {t("dashTabHistory")} ({completedTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "active" ? (
        /* Active Reminders List */
        pendingTasks.length === 0 ? (
          <View style={[styles.emptyChoreBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyChoreEmoji}>🎉</Text>
            <Text style={[styles.emptyChoreText, { color: colors.text }]}>{t("dashEmptyActiveTitle")}</Text>
            <Text style={[styles.emptyChoreSubText, { color: colors.inactiveText }]}>
              {t("dashEmptyActiveSub")}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {pendingTasks.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onOpenTask(item)}
                activeOpacity={0.7}
              >
                <View style={styles.taskCardMain}>
                  <Text style={[styles.taskTitle, { color: colors.text }]}>{item.title}</Text>
                  <View style={styles.taskInfoRow}>
                    <Text style={[styles.taskDueDate, { color: colors.subtitle }]}>
                      📅{" "}
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")
                        : "No Date"}
                      {item.isAllDay ? (lang === "zh" ? " (全天)" : " (All Day)") : ` @ ${item.dueTime}`}
                    </Text>
                    {item.remindTiming && item.remindTiming !== "none" && (
                      <Text style={styles.notificationBadge}>{t("dashAlertTitle")}</Text>
                    )}
                    {item.recurrence && item.recurrence !== "none" && (
                      <Text style={[styles.notificationBadge, { backgroundColor: "#34C759" }]}>
                        🔁 {recurrenceLabel(item.recurrence)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.completeTaskBtn} onPress={() => onCompleteTask(item)}>
                  <Text style={styles.completeTaskText}>{t("dashCompleteBtn")}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        /* History / Completed Reminders List */
        completedTasks.length === 0 ? (
          <View style={[styles.emptyChoreBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyChoreEmoji}>⏰</Text>
            <Text style={[styles.emptyChoreText, { color: colors.text }]}>{t("dashEmptyHistoryTitle")}</Text>
            <Text style={[styles.emptyChoreSubText, { color: colors.inactiveText }]}>
              {t("dashEmptyHistorySub")}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {completedTasks.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.taskCard,
                  styles.completedTaskCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => onOpenTask(item)}
                activeOpacity={0.7}
              >
                <View style={styles.taskCardMain}>
                  <Text style={[styles.taskTitle, styles.completedTaskTitle]}>{item.title}</Text>
                  <View style={styles.taskInfoRow}>
                    <Text style={styles.taskCompletedBy}>
                      ✅ {lang === "zh" ? "由" : "Done by "}
                      {item.completedBy === currentUserId
                        ? lang === "zh"
                          ? "你"
                          : "You"
                        : lang === "zh"
                        ? "伴侣"
                        : "Partner"}
                      {lang === "zh" ? "完成" : ""}
                    </Text>
                    {item.recurrence && item.recurrence !== "none" && (
                      <Text style={[styles.notificationBadge, { backgroundColor: "#34C759" }]}>
                        🔁 {recurrenceLabel(item.recurrence)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.restoreTaskBtn} onPress={() => onRestoreTask(item)}>
                  <Text style={styles.restoreTaskText}>{t("dashRestoreBtn")}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  choresHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addTaskBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addTaskText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 7,
  },
  tabButtonActive: {
    backgroundColor: "#FF5E7E",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  emptyChoreBox: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyChoreEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyChoreText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  emptyChoreSubText: {
    fontSize: 12,
  },
  tasksList: {
    gap: 10,
  },
  taskCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  taskCardMain: {
    flex: 1,
    paddingRight: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  taskInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  taskDueDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  notificationBadge: {
    backgroundColor: "rgba(52,199,89,0.12)",
    color: "#34C759",
    fontSize: 9,
    fontWeight: "700",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    textTransform: "uppercase",
  },
  completeTaskBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  completeTaskText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  completedTaskCard: {
    opacity: 0.6,
  },
  completedTaskTitle: {
    textDecorationLine: "line-through",
    color: "#8085A0",
  },
  taskCompletedBy: {
    fontSize: 11,
    color: "#34C759",
    fontWeight: "500",
  },
  restoreTaskBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  restoreTaskText: {
    color: "#A0A5C0",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default ReminderList;