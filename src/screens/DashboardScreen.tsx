import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Task, Milestone, HomeTabParamList } from "../types";
import {
  DashboardSkeleton,
  ExecutiveHeader,
  BudgetSummary,
  MilestoneHero,
  SavingsGoalsPreview,
  NudgeBar,
  ReminderList,
} from "../features/dashboard/components";
import { translations } from "../utils/translations";
import { ErrorState } from "../components/primitives/ErrorState";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../../firebaseConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUserProfileById } from "../hooks/useUserProfileById";
import { useGroup } from "../hooks/useGroup";
import { useTasks } from "../hooks/useTasks";
import { useMilestones } from "../hooks/useMilestones";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import { useTransactions } from "../hooks/useTransactions";
import { useNotificationPermissions } from "../hooks/useNotificationPermissions";

// Configure notification alerts when app is in foreground
let lastOpenedNotificationId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TIMING_OPTIONS = [
  { value: "at_time" },
  { value: "1_hour_before" },
  { value: "1_day_before" },
  { value: "2_days_before" },
  { value: "1_week_before" },
  { value: "none" }
];

const RECURRENCE_OPTIONS = [
  { value: "none" },
  { value: "daily" },
  { value: "weekly" },
  { value: "monthly" }
];

export default function DashboardScreen() {
  const currentUser = auth.currentUser;
  const navigation = useNavigation<BottomTabNavigationProp<HomeTabParamList>>();

  // Shared per-domain subscriptions. Each hook owns its listener (with
  // loading/error/retry) so the screen no longer manages raw onSnapshot effects.
  const { profile: userProfile } = useUserProfile(currentUser);
  const { profile: partnerProfile } = useUserProfileById(userProfile?.partnerId);
  const { group, error: groupError, retry: retryGroup } = useGroup(userProfile?.groupId);
  const { tasks, error: tasksError, retry: retryTasks } = useTasks(userProfile?.groupId);
  const {
    milestones,
    loading: milestonesLoading,
    error: milestonesError,
    retry: retryMilestones,
  } = useMilestones(userProfile?.groupId);
  const { goals: savingsGoals, error: savingsError, retry: retrySavings } =
    useSavingsGoals(userProfile?.groupId);
  const { transactions, error: txError, retry: retryTx } =
    useTransactions(userProfile?.groupId);
  const { ensurePermission: ensureNotificationPermission } = useNotificationPermissions();

  const loading = milestonesLoading;
  const collectionError = milestonesError ?? tasksError ?? savingsError ?? txError ?? groupError;
  const retryAll = useCallback(() => {
    retryGroup();
    retryTasks();
    retryMilestones();
    retrySavings();
    retryTx();
  }, [retryGroup, retryTasks, retryMilestones, retrySavings, retryTx]);

  const lang = userProfile?.languagePreference ?? "en";
  const t = useCallback(
    (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key],
    [lang]
  );

  const getTimingLabel = useCallback(
    (val: string) => {
      switch (val) {
        case "at_time": return t("remindAtTime");
        case "1_hour_before": return t("remind1HourBefore");
        case "1_day_before": return t("remind1DayBefore");
        case "2_days_before": return t("remind2DaysBefore");
        case "1_week_before": return t("remind1WeekBefore");
        default: return t("remindNone");
      }
    },
    [t]
  );

  const getRecurrenceLabel = useCallback(
    (val: string) => {
      switch (val) {
        case "daily": return lang === "zh" ? "每天" : "Daily";
        case "weekly": return lang === "zh" ? "每周" : "Weekly";
        case "monthly": return lang === "zh" ? "每月" : "Monthly";
        default: return lang === "zh" ? "仅一次" : "Once";
      }
    },
    [lang]
  );

  // Reminders segment tab selection
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Add Reminder Modal Form
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState<Date>(new Date());
  const [newTaskTime, setNewTaskTime] = useState<Date>(new Date());
  const [newTaskAllDay, setNewTaskAllDay] = useState(true);
  const [newTaskRemind, setNewTaskRemind] = useState<Task["remindTiming"]>("at_time");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<Task["recurrence"]>("none");
  
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [showTaskTimePicker, setShowTaskTimePicker] = useState(false);

  // Edit Reminder Modal Form
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDate, setEditTaskDate] = useState<Date>(new Date());
  const [editTaskTime, setEditTaskTime] = useState<Date>(new Date());
  const [editTaskAllDay, setEditTaskAllDay] = useState(true);
  const [editTaskRemind, setEditTaskRemind] = useState<Task["remindTiming"]>("at_time");
  const [editTaskRecurrence, setEditTaskRecurrence] = useState<Task["recurrence"]>("none");

  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  // Pairing Modal state
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);

  // Reminders Status Toggle & Highlight counters
  const [editTaskStatus, setEditTaskStatus] = useState<"pending" | "completed">("pending");
  const pendingNotificationTask = useRef<string | null>(null);

  const openTask = useCallback((item: Task) => {
    setSelectedTask(item);
    setEditTaskTitle(item.title);
    setEditTaskDate(item.dueDate ? new Date(item.dueDate) : new Date());
    setEditTaskAllDay(item.isAllDay ?? true);
    setEditTaskRemind(item.remindTiming ?? "at_time");
    setEditTaskRecurrence(item.recurrence ?? "none");
    setEditTaskStatus(item.status);
    if (item.dueTime) {
      const [h, m] = item.dueTime.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      setEditTaskTime(d);
    } else {
      setEditTaskTime(new Date());
    }
    setEditModalVisible(true);
  }, []);

  const tryOpenNotificationTask = useCallback((taskId: string) => {
    const item = tasks.find((task) => task.id === taskId);
    if (!item) {
      pendingNotificationTask.current = taskId;
      return;
    }
    pendingNotificationTask.current = null;
    navigation.navigate("Dashboard");
    openTask(item);
  }, [tasks, navigation, openTask]);

  useEffect(() => {
    if (pendingNotificationTask.current) {
      tryOpenNotificationTask(pendingNotificationTask.current);
    }
  }, [tasks, tryOpenNotificationTask]);

  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;
      const identifier = response.notification.request.identifier;
      const taskId = response.notification.request.content.data?.taskId;
      if (!identifier || typeof taskId !== "string" || lastOpenedNotificationId === identifier) return;
      lastOpenedNotificationId = identifier;
      tryOpenNotificationTask(taskId);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    return () => subscription.remove();
  }, [tryOpenNotificationTask]);
  const [featuredModalVisible, setFeaturedModalVisible] = useState(false);

  // Session guard: ensures the new-user setup prompt only fires once per app session
  const setupPromptShown = useRef(false);

  // Refs
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Notification permission is requested on first need (when a reminder is
  // actually scheduled), with an explanation — see useNotificationPermissions.



  // Setup prompt for newly registered users — only shown once per app session
  useEffect(() => {
    if (userProfile && userProfile.isNewUser && !setupPromptShown.current) {
      setupPromptShown.current = true;
      Alert.alert(
        t("newSetupPromptTitle"),
        t("newSetupPromptMsg"),
        [
          {
            text: lang === "zh" ? "稍后" : "Later",
            style: "cancel",
            onPress: async () => {
              try {
                await updateDoc(doc(db, "users", currentUser!.uid), {
                  isNewUser: false
                });
              } catch (err) {
                console.error("[Dashboard] Error clearing isNewUser flag:", err);
              }
            }
          },
          {
            text: lang === "zh" ? "立即设置" : "Setup Now",
            onPress: async () => {
              try {
                await updateDoc(doc(db, "users", currentUser!.uid), {
                  isNewUser: false
                });
                navigation.navigate("Settings");
              } catch (err) {
                console.error("[Dashboard] Error redirecting to settings:", err);
              }
            }
          }
        ],
        { cancelable: false }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot guarded by setupPromptShown ref; alert must only ever appear once per session.
  }, [userProfile?.isNewUser, lang]);







  // Note: Memory data is managed in MemoryCapsuleScreen. The dashboard only
  // shows the featured milestone widget and budget summary.

  // 6. Listen for incoming live nudges from partner
  useEffect(() => {
    if (!currentUser || !userProfile?.partnerId) return;

    const qNudges = query(
      collection(db, "nudges"),
      where("recipientId", "==", currentUser.uid),
      where("read", "==", false)
    );

    const unsubNudges = onSnapshot(qNudges, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type === "added") {
          const data = docChange.doc.data();
          const nudgeId = docChange.doc.id;
          
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "TwoFold Nudge! 💌",
                body: `${partnerProfile?.displayName ?? "Your partner"} sent you a ${data.type}!`,
                sound: true,
              },
              trigger: null, // trigger immediately!
            });

            // Mark as read so it doesn't trigger again
            await updateDoc(doc(db, "nudges", nudgeId), {
              read: true
            });
          } catch (err) {
            console.warn("[Nudges] Failed to trigger notification:", err);
          }
        }
      }
    }, (error) => {
      console.log("[Dashboard] Nudges listener error:", error.message);
    });

    return unsubNudges;
  }, [currentUser, userProfile?.partnerId, partnerProfile?.displayName]);

  const createInviteCode = async () => {
    if (!currentUser) return;
    setInviteLoading(true);
    try {
      const createInvite = httpsCallable<undefined, { code: string }>(functions, "createInvite");
      const result = await createInvite();
      setInviteCode(result.data.code);
    } catch (error) {
      console.error("[Dashboard] Invite creation failed:", error);
      Alert.alert(t("pairFailedTitle"), t("pairPleaseCode"));
    } finally {
      setInviteLoading(false);
    }
  };

  // Copy own invite code
  const copyToClipboard = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Share own invite code
  const shareCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: t("pairShareMsg").replace("{code}", inviteCode),
        title: t("pairShareTitle"),
      });
    } catch {
      // Ignore
    }
  };

  // Connect partner from dashboard
  const handleConnectPartner = async () => {
    if (!currentUser) return;
    const cleanedCode = partnerCode.trim();

    if (!cleanedCode) {
      Alert.alert(t("pairInvalidCode"), t("pairPleaseCode"));
      return;
    }

    setPairingLoading(true);
    try {
      const claimInvite = httpsCallable<{ code: string }, unknown>(functions, "claimInvite");
      await claimInvite({ code: cleanedCode });
      setPairModalVisible(false);
      setPartnerCode("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      if (message.includes("INVALID_INVITE")) {
        Alert.alert(t("pairInvalidCode"), t("pairPleaseCode"));
      } else if (message.includes("INVITE_USED") || message.includes("INVITE_EXPIRED")) {
        Alert.alert(t("pairInvalidCode"), message.includes("INVITE_USED") ? "This invite has already been used." : "This invite has expired.");
      } else if (message.includes("CREATOR_ALREADY_PAIRED")) {
        Alert.alert(t("pairPartnerAlreadyPairedTitle"), t("pairPartnerAlreadyPairedMsg"));
      } else {
        Alert.alert(t("pairFailedTitle"), message);
      }
    } finally {
      setPairingLoading(false);
    }
  };

  // Helper to schedule local notification for a reminder task
  const scheduleNotificationForReminder = async (
    taskId: string,
    title: string,
    dateStr: string,
    timeStr?: string,
    remindTiming?: Task["remindTiming"],
    recurrence?: Task["recurrence"]
  ) => {
    if (!remindTiming || remindTiming === "none") return null;

    // Ask for notification permission only when a reminder first needs it.
    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    try {
      // 1. Calculate notification trigger time
      const triggerDate = new Date(dateStr);
      if (timeStr) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        triggerDate.setHours(hours, minutes, 0, 0);
      } else {
        triggerDate.setHours(9, 0, 0, 0); // default to 9:00 AM on due day if all-day
      }

      let baseTimeMs = triggerDate.getTime();
      const timezone = userProfile?.timezoneLocation;

      // Convert trigger time based on selected home location timezone offset
      if (timezone && timezone !== "device") {
        const match = timezone.match(/UTC([+-]\d+)/);
        if (match) {
          const offsetHours = parseInt(match[1]);
          // Construct absolute UTC representation of target date-time:
          const faceUTC = Date.UTC(
            triggerDate.getFullYear(),
            triggerDate.getMonth(),
            triggerDate.getDate(),
            triggerDate.getHours(),
            triggerDate.getMinutes(),
            0,
            0
          );
          // Absolute UTC time representation for selected timezone hour
          baseTimeMs = faceUTC - (offsetHours * 60 * 60 * 1000);
        }
      }

      let offsetMs = 0;
      if (remindTiming === "1_hour_before") offsetMs = 60 * 60 * 1000;
      else if (remindTiming === "1_day_before") offsetMs = 24 * 60 * 60 * 1000;
      else if (remindTiming === "2_days_before") offsetMs = 2 * 24 * 60 * 60 * 1000;
      else if (remindTiming === "1_week_before") offsetMs = 7 * 24 * 60 * 60 * 1000;

      const notifyTime = baseTimeMs - offsetMs;

      // Don't schedule if notification target is in the past (for non-recurring only)
      if (notifyTime <= Date.now() && (!recurrence || recurrence === "none")) return null;

      const scheduleDate = new Date(notifyTime);

      let trigger: any;
      if (recurrence === "daily") {
        trigger = {
          hour: scheduleDate.getHours(),
          minute: scheduleDate.getMinutes(),
          repeats: true,
        };
      } else if (recurrence === "weekly") {
        trigger = {
          weekday: scheduleDate.getDay() + 1, // Expo weekday: 1 (Sun) - 7 (Sat)
          hour: scheduleDate.getHours(),
          minute: scheduleDate.getMinutes(),
          repeats: true,
        };
      } else if (recurrence === "monthly") {
        trigger = {
          day: scheduleDate.getDate(),
          hour: scheduleDate.getHours(),
          minute: scheduleDate.getMinutes(),
          repeats: true,
        };
      } else {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduleDate,
        };
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "TwoFold Reminder ⏰",
          body: `Don't forget: "${title}" is due soon!`,
          data: { taskId },
        },
        trigger,
      });

      console.log(`[Notification] Scheduled ${recurrence || "once"} notification ID: ${notificationId} for ${scheduleDate.toLocaleString()} (${timezone})`);
      return notificationId;
    } catch (e) {
      console.warn("[Notification] Failed to schedule notification:", e);
      return null;
    }
  };

  // Helper to cancel a scheduled notification
  const cancelScheduledNotification = async (notificationId?: string | null) => {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[Notification] Cancelled scheduled notification ID: ${notificationId}`);
    } catch (e) {
      console.warn("[Notification] Failed to cancel notification:", e);
    }
  };

  // Helper to get next recurrence date
  const getNextRecurrenceDate = (dateStr: string, recurrence: "daily" | "weekly" | "monthly"): string => {
    const date = new Date(dateStr);
    if (recurrence === "daily") {
      date.setDate(date.getDate() + 1);
    } else if (recurrence === "weekly") {
      date.setDate(date.getDate() + 7);
    } else if (recurrence === "monthly") {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split("T")[0];
  };

  // Add Reminder
  const handleAddReminder = async () => {
    if (!newTaskTitle.trim() || !userProfile?.groupId) return;

    try {
      const timeStr = newTaskAllDay ? "" : `${newTaskTime.getHours().toString().padStart(2, "0")}:${newTaskTime.getMinutes().toString().padStart(2, "0")}`;
      const dateStr = newTaskDate.toISOString().split("T")[0];

      // 1. Save placeholder first to get doc ID
      const newDocRef = await addDoc(collection(db, "tasks"), {
        groupId: userProfile.groupId,
        title: newTaskTitle.trim(),
        description: "",
        dueDate: dateStr,
        dueTime: timeStr,
        isAllDay: newTaskAllDay,
        remindTiming: newTaskRemind,
        createdBy: currentUser?.uid,
        status: "pending",
        createdAt: new Date().toISOString(),
        notificationId: null,
        recurrence: newTaskRecurrence
      });

      // 2. Schedule notification if enabled
      let notificationId = null;
      if (newTaskRemind !== "none") {
        notificationId = await scheduleNotificationForReminder(
          newDocRef.id,
          newTaskTitle.trim(),
          dateStr,
          timeStr,
          newTaskRemind,
          newTaskRecurrence
        );

        if (notificationId) {
          await updateDoc(doc(db, "tasks", newDocRef.id), {
            notificationId: notificationId
          });
        }
      }

      setNewTaskTitle("");
      setNewTaskDate(new Date());
      setNewTaskTime(new Date());
      setNewTaskAllDay(true);
      setNewTaskRemind("at_time");
      setNewTaskRecurrence("none");
      setTaskModalVisible(false);
      Alert.alert(t("dashReminderCreatedTitle"), t("dashReminderCreatedMsg"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("dashReminderFailedAdd"), msg);
    }
  };

  // Edit Reminder
  const handleEditReminder = async () => {
    if (!selectedTask || !editTaskTitle.trim()) return;

    try {
      const timeStr = editTaskAllDay ? "" : `${editTaskTime.getHours().toString().padStart(2, "0")}:${editTaskTime.getMinutes().toString().padStart(2, "0")}`;
      const dateStr = editTaskDate.toISOString().split("T")[0];

      // 1. Cancel previous notification if existed
      await cancelScheduledNotification(selectedTask.notificationId ?? null);

      // 2. Schedule new notification if reminder status is still active
      let newNotificationId = null;
      if (editTaskStatus === "pending" && editTaskRemind !== "none") {
        newNotificationId = await scheduleNotificationForReminder(
          selectedTask.id,
          editTaskTitle.trim(),
          dateStr,
          timeStr,
          editTaskRemind,
          editTaskRecurrence
        );
      }

      await updateDoc(doc(db, "tasks", selectedTask.id), {
        title: editTaskTitle.trim(),
        dueDate: dateStr,
        dueTime: timeStr,
        isAllDay: editTaskAllDay,
        remindTiming: editTaskRemind,
        status: editTaskStatus,
        completedBy: editTaskStatus === "completed" ? (selectedTask.completedBy || currentUser?.uid) : null,
        completedAt: editTaskStatus === "completed" ? (selectedTask.completedAt || new Date().toISOString()) : null,
        notificationId: newNotificationId || null,
        recurrence: editTaskRecurrence
      });

      setEditModalVisible(false);
      setSelectedTask(null);
      Alert.alert(t("dashReminderUpdatedTitle"), t("dashReminderUpdatedMsg"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("dashReminderFailedUpdate"), msg);
    }
  };

  // Delete Reminder
  const handleDeleteReminder = (taskToDelete?: Task) => {
    const target = taskToDelete || selectedTask;
    if (!target) return;

    Alert.alert(
      t("dashDeleteReminderTitle"),
      t("dashDeleteReminderConfirm").replace("{title}", target.title),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Cancel notification
              await cancelScheduledNotification(target.notificationId ?? null);

              await deleteDoc(doc(db, "tasks", target.id));
              setEditModalVisible(false);
              setSelectedTask(null);
              Alert.alert(t("dashReminderDeletedTitle"), t("dashReminderDeletedMsg"));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("dashReminderFailedDelete"), msg);
            }
          },
        },
      ]
    );
  };

  // Complete Reminder
  const handleCompleteReminder = async (task: Task) => {
    if (!currentUser) return;

    try {
      // Cancel notification
      await cancelScheduledNotification(task.notificationId ?? null);

      if (task.recurrence && task.recurrence !== "none") {
        const nextDateStr = getNextRecurrenceDate(task.dueDate, task.recurrence);
        
        let newNotificationId = null;
        if (task.remindTiming && task.remindTiming !== "none") {
          newNotificationId = await scheduleNotificationForReminder(
            task.id,
            task.title,
            nextDateStr,
            task.dueTime,
            task.remindTiming,
            task.recurrence
          );
        }

        await updateDoc(doc(db, "tasks", task.id), {
          dueDate: nextDateStr,
          notificationId: newNotificationId || null
        });

        const successMsg = lang === "zh"
          ? `已完成！该提醒为重复提醒，日期已更新到下一次：${nextDateStr}`
          : `Done! Since this is a recurring reminder, the date has been updated to: ${nextDateStr}`;
        Alert.alert(lang === "zh" ? "重复提醒已更新 🔁" : "Recurring Reminder Updated 🔁", successMsg);
      } else {
        await updateDoc(doc(db, "tasks", task.id), {
          status: "completed",
          completedBy: currentUser.uid,
          completedAt: new Date().toISOString(),
          notificationId: null
        });

        Alert.alert(t("dashReminderCompletedTitle"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("error"), msg);
    }
  };

  // Restore Completed Reminder to Active
  const handleRestoreReminder = async (task: Task) => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: "pending",
        completedBy: null,
        completedAt: null,
      });

      Alert.alert(t("dashReminderRestoredTitle"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("dashReminderFailedRestore"), msg);
    }
  };

  // Playful Nudge Alerts
  const handleSendNudge = async (type: string) => {
    if (!currentUser || !userProfile?.partnerId) {
      Alert.alert(t("dashNudgeInfoTitle"), t("dashNudgeSoloMsg").replace("{type}", type));
      return;
    }

    try {
      await addDoc(collection(db, "nudges"), {
        senderId: currentUser.uid,
        recipientId: userProfile.partnerId,
        type: type,
        createdAt: new Date().toISOString(),
        read: false
      });
      Alert.alert(
        t("dashNudgeSentTitle"),
        t("dashNudgeLiveMsg")
          .replace("{type}", type)
          .replace("{partner}", partnerProfile?.displayName ?? (lang === "zh" ? "你的伴侣" : "your partner"))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn("[Nudge] Save failed:", msg);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert(t("logoutConfirmTitle"), t("logoutConfirmMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("settingsLogoutBtn"),
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("[Dashboard] Logout error:", error);
          }
        },
      },
    ]);
  };

  // Theme Styling Settings
  const isDark = userProfile?.themePreference !== "light";
  const colors = {
    background: isDark ? "#0A0B10" : "#F8F9FA",
    card: isDark ? "#131520" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1C29",
    subtitle: isDark ? "#A0A5C0" : "#606580",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    activeTab: "#FF5E7E",
    tabBackground: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    inactiveText: isDark ? "#606580" : "#A0A5C0",
    inputBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    inputBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    placeholderText: isDark ? "#606580" : "#A0A5C0"
  };

  // Custom Currency symbol
  const activeCurrency = userProfile?.currencyPreference ?? "$";

  // Calculate dynamic stats
  const activeRemindersCount = tasks.filter((t) => t.status === "pending").length;
  
  // Find nearest upcoming milestone
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingMilestone = milestones
    .filter((m) => m.date.split("T")[0] >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const calculateDays = (dateStr: string): number => {
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Featured milestone (either customized or fallback to nearest upcoming, or fallback to first milestone in list if no upcoming is found)
  const featuredMilestone = group?.featuredMilestoneId
    ? milestones.find((m) => m.id === group.featuredMilestoneId)
    : (upcomingMilestone ?? milestones[0]);

  const formatYearsAndDays = (totalDays: number, labelType: "together" | "to_go" | "ago"): string => {
    const years = Math.floor(totalDays / 365);
    const days = totalDays % 365;
    
    if (lang === "zh") {
      const yearsPart = years > 0 ? `${years}年` : "";
      const daysPart = `${days}天`;
      const timeStr = `${yearsPart}${daysPart}`;
      if (labelType === "together") return `已相伴 ${timeStr}`;
      if (labelType === "to_go") return `还剩 ${timeStr}`;
      return `${timeStr} 以前`;
    } else {
      const yearsPart = years > 0 ? `${years} year${years > 1 ? "s" : ""} ` : "";
      const daysPart = `${days} day${days !== 1 ? "s" : ""}`;
      const timeStr = `${yearsPart}${daysPart}`;
      if (labelType === "together") return `${timeStr} together`;
      if (labelType === "to_go") return `${timeStr} to go`;
      return `${timeStr} ago`;
    }
  };

  const getMilestoneLabel = (m: Milestone) => {
    const diffDays = calculateDays(m.date);
    const absDays = Math.abs(diffDays);
    
    if (diffDays === 0) return lang === "zh" ? "今天！🎂" : "Today! 🎂";
    
    const labelType = m.isCountdown
      ? diffDays < 0
        ? "to_go"
        : "ago"
      : "together";
      
    return formatYearsAndDays(absDays, labelType);
  };

  const handleSelectFeaturedMilestone = async (milestoneId: string | null) => {
    if (!userProfile?.groupId) return;
    try {
      await updateDoc(doc(db, "groups", userProfile.groupId), {
        featuredMilestoneId: milestoneId
      });
      setFeaturedModalVisible(false);
      Alert.alert(t("dashMilestoneUpdatedTitle"), t("dashMilestoneUpdatedMsg"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("dashReminderFailedUpdate"), msg);
    }
  };

  // Calculate dynamic remaining budget pool balance
  const startingAllowance = group?.budgetBalance ?? 1000;
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncomes = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const remainingBalance = startingAllowance - totalExpenses + totalIncomes;

  if (loading) {
    return <DashboardSkeleton colors={colors} />;
  }

  if (collectionError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          title="Couldn't load your dashboard"
          message={collectionError}
          retryLabel="Retry"
          onRetry={retryAll}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Executive Header */}
        <ExecutiveHeader
          colors={colors}
          t={t}
          lang={lang}
          displayName={userProfile?.displayName ?? null}
          partnerName={partnerProfile?.displayName ?? null}
          isSolo={!!userProfile?.isSolo}
          onLogout={handleLogout}
          onLinkPartner={() => {
            setPairModalVisible(true);
            if (!inviteCode) void createInviteCode();
          }}
        />
        {/* Executive Summary Stats Grid */}
        <BudgetSummary
          colors={colors}
          t={t}
          remainingBalance={remainingBalance}
          activeCurrency={activeCurrency}
          activeRemindersCount={activeRemindersCount}
        />
        {/* Custom Pinned Milestone Highlight Widget */}
        <MilestoneHero
          colors={colors}
          lang={lang}
          milestone={featuredMilestone ?? null}
          label={featuredMilestone ? getMilestoneLabel(featuredMilestone) : null}
          onPress={() => setFeaturedModalVisible(true)}
        />
        {/* Savings Goals Home Progress Widget */}
        <SavingsGoalsPreview
          colors={colors}
          lang={lang}
          activeCurrency={activeCurrency}
          goals={savingsGoals}
        />
        {/* Playful Nudges Grid */}
        <NudgeBar
          colors={colors}
          lang={lang}
          t={t}
          onSend={(payload) => handleSendNudge(payload)}
        />
        {/* Reminders / Chores Section */}
        <ReminderList
          colors={colors}
          lang={lang}
          t={t}
          activeTab={activeTab}
          pendingTasks={tasks.filter((x) => x.status === "pending")}
          completedTasks={tasks.filter((x) => x.status === "completed")}
          currentUserId={currentUser?.uid ?? null}
          onTabChange={setActiveTab}
          onAddReminder={() => setTaskModalVisible(true)}
          onOpenTask={openTask}
          onCompleteTask={handleCompleteReminder}
          onRestoreTask={handleRestoreReminder}
        />
      </ScrollView>

      {/* Task Creation Modal */}
      <Modal visible={taskModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{t("dashAddReminderTitle")}</Text>

              <Text style={styles.modalLabel}>{t("dashReminderDescription")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("dashPlaceholderReminder")}
                placeholderTextColor="#606580"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="next"
              />

              <Text style={styles.modalLabel}>{t("dashDueDate")}</Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowTaskDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.datePickerTriggerText}>
                  📅 {newTaskDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </Text>
              </TouchableOpacity>

              {showTaskDatePicker && (
                <DateTimePicker
                  value={newTaskDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant={isDark ? "dark" : "light"}
                  textColor={isDark ? "#FFFFFF" : "#000000"}
                  onChange={(event, selectedDate) => {
                    setShowTaskDatePicker(Platform.OS === "ios");
                    if (selectedDate) {
                      setNewTaskDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Time Toggle Option */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNewTaskAllDay(!newTaskAllDay)}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleText}>{t("dashAllDay")}</Text>
                <View style={[styles.toggleBox, newTaskAllDay && styles.toggleBoxActive]}>
                  <Text style={styles.toggleIndicator}>{newTaskAllDay ? "✓" : ""}</Text>
                </View>
              </TouchableOpacity>

              {/* Time Selection */}
              {!newTaskAllDay && (
                <>
                  <Text style={styles.modalLabel}>{t("dashDueTime")}</Text>
                  <TouchableOpacity
                    style={styles.datePickerTrigger}
                    onPress={() => setShowTaskTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerTriggerText}>
                      ⏰ {newTaskTime.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>

                  {showTaskTimePicker && (
                    <DateTimePicker
                      value={newTaskTime}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant={isDark ? "dark" : "light"}
                      textColor={isDark ? "#FFFFFF" : "#000000"}
                      onChange={(event, selectedDate) => {
                        setShowTaskTimePicker(Platform.OS === "ios");
                        if (selectedDate) {
                          setNewTaskTime(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* Recurrence Option */}
              <Text style={styles.modalLabel}>{lang === "zh" ? "重复周期" : "Recurrence"}</Text>
              <View style={styles.timingSelectorGrid}>
                {RECURRENCE_OPTIONS.map((opt) => {
                  const isActive = newTaskRecurrence === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.timingBtn, isActive && styles.timingBtnActive]}
                      onPress={() => setNewTaskRecurrence(opt.value as any)}
                    >
                      <Text style={[styles.timingBtnText, isActive && styles.timingBtnTextActive]}>
                        {getRecurrenceLabel(opt.value)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Reminder Timing Option */}
              <Text style={styles.modalLabel}>{t("dashRemindWhen")}</Text>
              <View style={styles.timingSelectorGrid}>
                {TIMING_OPTIONS.map((opt) => {
                  const isActive = newTaskRemind === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.timingBtn, isActive && styles.timingBtnActive]}
                      onPress={() => setNewTaskRemind(opt.value as any)}
                    >
                      <Text style={[styles.timingBtnText, isActive && styles.timingBtnTextActive]}>
                        {getTimingLabel(opt.value)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setNewTaskTitle("");
                    setNewTaskDate(new Date());
                    setNewTaskTime(new Date());
                    setNewTaskAllDay(true);
                    setNewTaskRemind("at_time");
                    setNewTaskRecurrence("none");
                    setTaskModalVisible(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleAddReminder}>
                  <Text style={styles.modalSubmitText}>{lang === "zh" ? "添加" : "Add"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Reminder Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {selectedTask?.status === "completed" ? (lang === "zh" ? "已完成的提醒" : "Completed Reminder") : t("dashEditReminderTitle")}
              </Text>

              <Text style={styles.modalLabel}>{t("dashReminderDescription")}</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  editTaskStatus === "completed" && { color: "#8085A0", opacity: 0.8 }
                ]}
                placeholder={t("dashPlaceholderReminder")}
                placeholderTextColor="#606580"
                value={editTaskTitle}
                onChangeText={setEditTaskTitle}
              />

              <Text style={styles.modalLabel}>{lang === "zh" ? "提醒状态" : "Reminder Status"}</Text>
              <View style={styles.statusToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                    editTaskStatus === "pending" && styles.statusToggleBtnActivePending
                  ]}
                  onPress={() => setEditTaskStatus("pending")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusToggleBtnText, editTaskStatus === "pending" && styles.statusToggleBtnTextActivePending, { color: editTaskStatus === "pending" ? "#FFFFFF" : colors.inactiveText }]}>
                    {t("dashKeepActive")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                    editTaskStatus === "completed" && styles.statusToggleBtnActiveCompleted
                  ]}
                  onPress={() => setEditTaskStatus("completed")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusToggleBtnText, editTaskStatus === "completed" && styles.statusToggleBtnTextActiveCompleted, { color: editTaskStatus === "completed" ? "#FFFFFF" : colors.inactiveText }]}>
                    {t("dashCompletedToggle")}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>{t("dashDueDate")}</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerTrigger,
                  selectedTask?.status === "completed" && { opacity: 0.6 }
                ]}
                onPress={() => {
                  if (selectedTask?.status !== "completed") {
                    setShowEditDatePicker(true);
                  }
                }}
                activeOpacity={0.7}
                disabled={selectedTask?.status === "completed"}
              >
                <Text style={styles.datePickerTriggerText}>
                  📅 {editTaskDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </Text>
              </TouchableOpacity>

              {showEditDatePicker && (
                <DateTimePicker
                  value={editTaskDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant={isDark ? "dark" : "light"}
                  textColor={isDark ? "#FFFFFF" : "#000000"}
                  onChange={(event, selectedDate) => {
                    setShowEditDatePicker(Platform.OS === "ios");
                    if (selectedDate) {
                      setEditTaskDate(selectedDate);
                    }
                  }}
                />
              )}

              {/* Time Toggle Option */}
              {selectedTask?.status !== "completed" && (
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setEditTaskAllDay(!editTaskAllDay)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleText}>{t("dashAllDay")}</Text>
                  <View style={[styles.toggleBox, editTaskAllDay && styles.toggleBoxActive]}>
                    <Text style={styles.toggleIndicator}>{editTaskAllDay ? "✓" : ""}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Time Selection */}
              {!editTaskAllDay && selectedTask?.status !== "completed" && (
                <>
                  <Text style={styles.modalLabel}>{t("dashDueTime")}</Text>
                  <TouchableOpacity
                    style={styles.datePickerTrigger}
                    onPress={() => setShowEditTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerTriggerText}>
                      ⏰ {editTaskTime.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>

                  {showEditTimePicker && (
                    <DateTimePicker
                      value={editTaskTime}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant={isDark ? "dark" : "light"}
                      textColor={isDark ? "#FFFFFF" : "#000000"}
                      onChange={(event, selectedDate) => {
                        setShowEditTimePicker(Platform.OS === "ios");
                        if (selectedDate) {
                          setEditTaskTime(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* Recurrence Option */}
              {selectedTask?.status !== "completed" && (
                <>
                  <Text style={styles.modalLabel}>{lang === "zh" ? "重复周期" : "Recurrence"}</Text>
                  <View style={styles.timingSelectorGrid}>
                    {RECURRENCE_OPTIONS.map((opt) => {
                      const isActive = editTaskRecurrence === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.timingBtn, isActive && styles.timingBtnActive]}
                          onPress={() => setEditTaskRecurrence(opt.value as any)}
                        >
                          <Text style={[styles.timingBtnText, isActive && styles.timingBtnTextActive]}>
                            {getRecurrenceLabel(opt.value)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Reminder Timing Option */}
              {selectedTask?.status !== "completed" && (
                <>
                  <Text style={styles.modalLabel}>{t("dashRemindWhen")}</Text>
                  <View style={styles.timingSelectorGrid}>
                    {TIMING_OPTIONS.map((opt) => {
                      const isActive = editTaskRemind === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.timingBtn, isActive && styles.timingBtnActive]}
                          onPress={() => setEditTaskRemind(opt.value as any)}
                        >
                          <Text style={[styles.timingBtnText, isActive && styles.timingBtnTextActive]}>
                            {getTimingLabel(opt.value)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                {/* Delete Button */}
                <TouchableOpacity
                  style={[styles.modalCancel, { marginRight: "auto" }]}
                  onPress={() => handleDeleteReminder()}
                >
                  <Text style={[styles.modalCancelText, { color: "#FF3B30", fontWeight: "700" }]}>{lang === "zh" ? "🗑️ 删除" : "🗑️ Delete"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setEditModalVisible(false);
                    setSelectedTask(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>{lang === "zh" ? "关闭" : "Close"}</Text>
                </TouchableOpacity>

                {selectedTask?.status !== "completed" && (
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleEditReminder}>
                    <Text style={styles.modalSubmitText}>{lang === "zh" ? "保存" : "Save"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Link Partner Modal */}
      <Modal visible={pairModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <ScrollView contentContainerStyle={styles.pairingModalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{t("pairTitle")}</Text>
              <Text style={styles.modalSubtitle}>
                {t("pairSubtitle")}
              </Text>

              {/* Invite Code */}
              <View style={styles.dashboardCodeBox}>
                <Text style={styles.dashboardCodeLabel}>{t("pairYourCode")}</Text>
                <Text style={styles.dashboardCodeText} numberOfLines={1} ellipsizeMode="middle">
                  {inviteLoading ? t("pairLoading") : inviteCode ?? t("pairInvalidCode")}
                </Text>
                <View style={styles.dashboardCodeActions}>
                  <TouchableOpacity style={styles.dashboardCodeBtn} onPress={copyToClipboard}>
                    <Text style={styles.dashboardCodeBtnText}>
                      {copied ? (lang === "zh" ? "✓ 已复制" : "✓ Copied") : t("pairCopyBtn")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dashboardCodeBtn, styles.dashboardCodeBtnPrimary]} onPress={shareCode}>
                    <Text style={[styles.dashboardCodeBtnText, styles.dashboardCodeBtnTextPrimary]}>
                      {t("pairShareBtn")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Enter Code */}
              <Text style={styles.modalLabel}>{t("pairEnterPartner")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("pairPlaceholder")}
                placeholderTextColor="#606580"
                value={partnerCode}
                onChangeText={(value) => setPartnerCode(value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleConnectPartner}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setPartnerCode("");
                    setPairModalVisible(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>{lang === "zh" ? "关闭" : "Close"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmit, pairingLoading && styles.modalSubmitDisabled]}
                  onPress={handleConnectPartner}
                  disabled={pairingLoading}
                >
                  {pairingLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>{t("pairConnectBtn")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Featured Milestone Selection Modal */}
      <Modal visible={featuredModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: "80%" }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("dashHighlightMilestoneTitle")}</Text>
            <Text style={[styles.allowanceHint, { color: colors.subtitle }]}>
              {t("dashHighlightMilestoneSub")}
            </Text>

            <ScrollView style={{ marginVertical: 12 }} showsVerticalScrollIndicator={false}>
              {/* Option to clear/set Auto */}
              <TouchableOpacity
                style={[
                  styles.featuredSelectCard,
                  { backgroundColor: !group?.featuredMilestoneId ? "rgba(255,94,126,0.1)" : colors.inputBg, borderColor: !group?.featuredMilestoneId ? "#FF5E7E" : colors.border }
                ]}
                onPress={() => handleSelectFeaturedMilestone(null)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featuredSelectTitle, { color: colors.text }]}>{t("dashAutoSelect")}</Text>
                  <Text style={[styles.featuredSelectSub, { color: colors.subtitle }]}>{t("dashAutoSelectSub")}</Text>
                </View>
                {!group?.featuredMilestoneId && <Text style={{ fontSize: 18, color: "#FF5E7E" }}>✓</Text>}
              </TouchableOpacity>

              {milestones.length === 0 ? (
                <Text style={[styles.emptyChoreSubText, { color: colors.inactiveText, textAlign: "center", marginVertical: 20 }]}>
                  {t("dashNoMilestonesPrompt")}
                </Text>
              ) : (
                milestones.map((m) => {
                  const isSelected = group?.featuredMilestoneId === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.featuredSelectCard,
                        { backgroundColor: isSelected ? "rgba(255,94,126,0.1)" : colors.inputBg, borderColor: isSelected ? "#FF5E7E" : colors.border }
                      ]}
                      onPress={() => handleSelectFeaturedMilestone(m.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.featuredSelectTitle, { color: colors.text }]}>{m.title}</Text>
                        <Text style={[styles.featuredSelectSub, { color: colors.subtitle }]}>
                          {new Date(m.date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}. {getMilestoneLabel(m)}
                        </Text>
                      </View>
                      {isSelected && <Text style={{ fontSize: 18, color: "#FF5E7E" }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCancel, { alignSelf: "center", marginTop: 8 }]}
              onPress={() => setFeaturedModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>{lang === "zh" ? "关闭" : "Close"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
  },
  coupleLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  partnerName: {
    fontWeight: "700",
    color: "#FF5E7E",
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: "#FF3B30",
    fontSize: 11,
    fontWeight: "700",
  },
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
  milestoneEmoji: {
    fontSize: 28,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  nudgesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  nudgeBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  nudgeBtnEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  nudgeBtnText: {
    fontSize: 10,
    fontWeight: "600",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#131520",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    height: 48,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },
  datePickerTrigger: {
    height: 48,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  datePickerTriggerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    marginBottom: 14,
  },
  toggleText: {
    color: "#A0A5C0",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBoxActive: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  toggleIndicator: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  timingSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  timingBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  timingBtnActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  timingBtnText: {
    color: "#A0A5C0",
    fontSize: 11,
    fontWeight: "600",
  },
  timingBtnTextActive: {
    color: "#FFFFFF",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSubmit: {
    backgroundColor: "#FF5E7E",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  linkPartnerHeaderBtn: {
    marginTop: 4,
    backgroundColor: "rgba(255, 94, 126, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  linkPartnerHeaderText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  batteryPlaceholderBtn: {
    height: 72,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderStyle: "dashed",
    marginTop: 10,
    marginBottom: 4,
  },
  batteryPlaceholderText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
  },
  pairingModalContent: {
    paddingVertical: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#A0A5C0",
    marginBottom: 20,
    lineHeight: 20,
  },
  dashboardCodeBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 20,
  },
  dashboardCodeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  dashboardCodeText: {
    color: "#FF5E7E",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  dashboardCodeActions: {
    flexDirection: "row",
    gap: 8,
  },
  dashboardCodeBtn: {
    flex: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  dashboardCodeBtnPrimary: {
    backgroundColor: "rgba(255, 94, 126, 0.1)",
    borderColor: "rgba(255, 94, 126, 0.2)",
  },
  dashboardCodeBtnText: {
    color: "#A0A5C0",
    fontSize: 11,
    fontWeight: "700",
  },
  dashboardCodeBtnTextPrimary: {
    color: "#FF5E7E",
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  statusToggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statusToggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statusToggleBtnActivePending: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  statusToggleBtnActiveCompleted: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  },
  statusToggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusToggleBtnTextActivePending: {
    color: "#FFFFFF",
  },
  statusToggleBtnTextActiveCompleted: {
    color: "#FFFFFF",
  },
  memoriesHighlightCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  memoriesHighlightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  memoriesHighlightTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  toggleMemModeBtn: {
    backgroundColor: "rgba(255, 94, 126, 0.1)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  toggleMemModeBtnText: {
    color: "#FF5E7E",
    fontSize: 11,
    fontWeight: "700",
  },
  memoriesScrollHorizontal: {
    paddingRight: 10,
  },
  memoriesScrollVertical: {
    gap: 12,
  },
  memHighlightItem: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  memHighlightImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
  },
  memHighlightVideoPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  memHighlightBody: {
    padding: 12,
  },
  memHighlightText: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
    marginBottom: 4,
  },
  memHighlightMeta: {
    fontSize: 9,
    fontWeight: "500",
  },
  featuredSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  featuredSelectTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  featuredSelectSub: {
    fontSize: 12,
  },
  allowanceHint: {
    fontSize: 13,
    color: "#A0A5C0",
    lineHeight: 18,
    marginBottom: 16,
  },
  savingsHomeWidget: {
    marginBottom: 20,
  },
  savingsHomeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  savingsHomeTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  savingsHomeProgressText: {
    fontSize: 13,
    fontWeight: "700",
  },
  savingsHomeProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    marginBottom: 10,
    overflow: "hidden",
  },
  savingsHomeProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  savingsHomeDateText: {
    fontSize: 11,
    color: "#8085A0",
  },
});
