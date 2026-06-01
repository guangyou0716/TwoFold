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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  runTransaction
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { Task, UserProfile, GroupProfile } from "../types";

export default function DashboardScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myBattery, setMyBattery] = useState(100);
  const [myStatus, setMyStatus] = useState("");

  // Modals
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState("10");

  // Ref for debounced mood update
  const moodUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (moodUpdateTimeoutRef.current) {
        clearTimeout(moodUpdateTimeoutRef.current);
      }
    };
  }, []);

  // 1. Subscribe to current user's profile
  useEffect(() => {
    if (!currentUser) return;

    const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setUserProfile(data);
        if (data.moodBattery) {
          setMyBattery(data.moodBattery.level);
          setMyStatus(data.moodBattery.status);
        }
      }
    });

    return unsubUser;
  }, [currentUser]);

  // 2. Subscribe to partner profile — separate effect to prevent listener accumulation
  useEffect(() => {
    if (!userProfile?.partnerId) {
      setPartnerProfile(null);
      return;
    }

    const unsubPartner = onSnapshot(doc(db, "users", userProfile.partnerId), (snap) => {
      setPartnerProfile(snap.data() as UserProfile ?? null);
    });

    return unsubPartner;
  }, [userProfile?.partnerId]);

  // 3. Subscribe to group profile and tasks
  useEffect(() => {
    if (!userProfile?.groupId) return;

    const unsubGroup = onSnapshot(doc(db, "groups", userProfile.groupId), (snap) => {
      setGroup(snap.data() as GroupProfile ?? null);
    });

    const q = query(
      collection(db, "tasks"),
      where("groupId", "==", userProfile.groupId),
      where("status", "==", "pending")
    );
    const unsubTasks = onSnapshot(q, (snap) => {
      const loadedTasks: Task[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Task)
      );
      loadedTasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setTasks(loadedTasks);
    });

    return () => {
      unsubGroup();
      unsubTasks();
    };
  }, [userProfile?.groupId]);

  // Mood update with debounce (500ms) to avoid Firestore spam
  const handleUpdateMood = useCallback((newVal: number) => {
    if (!currentUser) return;
    setMyBattery(newVal);

    if (moodUpdateTimeoutRef.current) {
      clearTimeout(moodUpdateTimeoutRef.current);
    }
    moodUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          "moodBattery.level": newVal,
          "moodBattery.updatedAt": new Date().toISOString(),
        });
      } catch (err) {
        console.error("[Dashboard] Mood update failed:", err);
      }
    }, 500);
  }, [currentUser]);

  const handleUpdateStatus = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        "moodBattery.status": myStatus,
        "moodBattery.updatedAt": new Date().toISOString(),
      });
      Alert.alert("Status Updated", "Your partner can now see how you are feeling! 💌");
    } catch (err) {
      console.error("[Dashboard] Status update failed:", err);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a task description.");
      return;
    }

    // Clamp points to 1–100 range
    const points = Math.max(1, Math.min(100, parseInt(newTaskPoints, 10) || 10));

    try {
      await addDoc(collection(db, "tasks"), {
        groupId: userProfile?.groupId,
        title: newTaskTitle.trim(),
        description: "",
        pointsValue: points,
        createdBy: currentUser?.uid,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setNewTaskTitle("");
      setNewTaskPoints("10");
      setTaskModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Failed to Add Chore", msg);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!currentUser || !userProfile?.groupId) return;

    try {
      const groupRef = doc(db, "groups", userProfile.groupId);
      const taskRef = doc(db, "tasks", task.id);
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupRef);
        if (!groupSnap.exists()) throw new Error("Group does not exist!");

        const groupData = groupSnap.data() as GroupProfile;
        const currentBalance = groupData.balances[currentUser.uid] ?? 0;
        const newBalance = currentBalance + task.pointsValue;

        // Streak calculation
        const lastChoreDate = groupData.streaks?.lastChoreDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = groupData.streaks?.choreStreak ?? 0;
        if (lastChoreDate === yesterdayStr || lastChoreDate === today) {
          // Continued or same-day streak — only increment if different day
          if (lastChoreDate !== today) {
            newStreak += 1;
          }
        } else {
          // Streak broken — restart at 1
          newStreak = 1;
        }

        transaction.update(taskRef, {
          status: "completed",
          completedBy: currentUser.uid,
          completedAt: new Date().toISOString(),
        });

        transaction.update(groupRef, {
          [`balances.${currentUser.uid}`]: newBalance,
          "streaks.choreStreak": newStreak,
          "streaks.lastChoreDate": today,
        });
      });

      Alert.alert("Chore Done! 🎉", `You earned ${task.pointsValue} points!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Dashboard] Complete task error:", err);
      Alert.alert("Error", `Failed to complete chore: ${msg}`);
    }
  };

  const handleSendNudge = (type: string) => {
    // TODO: Wire up FCM push notification via Firebase Cloud Functions
    Alert.alert("Nudge Sent! 💌", `Sent a ${type} to ${partnerProfile?.displayName ?? "your partner"}!`);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
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

  const myPoints = currentUser ? group?.balances?.[currentUser.uid] ?? 0 : 0;
  const choreStreak = group?.streaks?.choreStreak ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {userProfile?.displayName ?? "…"} 👋</Text>
            <Text style={styles.coupleLabel}>
              Paired with{" "}
              <Text style={styles.partnerName}>{partnerProfile?.displayName ?? "…"}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.dashboardCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>🔥 Streak</Text>
            <Text style={styles.statValue}>{choreStreak} Days</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>🎁 My Points</Text>
            <Text style={[styles.statValue, { color: "#FF5E7E" }]}>{myPoints} pts</Text>
          </View>
        </View>

        {/* Mood Batteries */}
        <Text style={styles.sectionTitle}>Mood Batteries</Text>
        <View style={styles.moodSection}>

          {/* Partner's mood (read-only) */}
          <View style={styles.batteryContainer}>
            <Text style={styles.batteryLabel}>
              {partnerProfile?.displayName ?? "Partner"}'s Battery
            </Text>
            <View style={styles.batteryOuter}>
              <View
                style={[
                  styles.batteryInner,
                  {
                    width: `${partnerProfile?.moodBattery?.level ?? 0}%` as any,
                    backgroundColor:
                      (partnerProfile?.moodBattery?.level ?? 0) < 30
                        ? "#FF3B30"
                        : (partnerProfile?.moodBattery?.level ?? 0) < 70
                        ? "#FFCC00"
                        : "#34C759",
                  },
                ]}
              />
              <Text style={styles.batteryPercentText}>{partnerProfile?.moodBattery?.level ?? 0}%</Text>
            </View>
            {/* FIXED: was a raw JSX string bug — now properly renders the status value */}
            <Text style={styles.batteryStatusText} numberOfLines={1}>
              "{partnerProfile?.moodBattery?.status ?? "Doing okay..."}"
            </Text>
          </View>

          {/* Your mood (interactive) */}
          <View style={[styles.batteryContainer, styles.myBatteryBox]}>
            <Text style={styles.batteryLabel}>Your Battery</Text>
            <View style={styles.batteryOuter}>
              <View
                style={[
                  styles.batteryInner,
                  {
                    width: `${myBattery}%` as any,
                    backgroundColor:
                      myBattery < 30 ? "#FF3B30" : myBattery < 70 ? "#FFCC00" : "#34C759",
                  },
                ]}
              />
              <Text style={styles.batteryPercentText}>{myBattery}%</Text>
            </View>

            <View style={styles.sliderControlRow}>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => handleUpdateMood(Math.max(0, myBattery - 10))}
              >
                <Text style={styles.controlBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.sliderInstruction}>Tap to adjust charge</Text>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => handleUpdateMood(Math.min(100, myBattery + 10))}
              >
                <Text style={styles.controlBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusInputWrapper}>
              <TextInput
                style={styles.statusInput}
                placeholder="What's your current vibe?"
                placeholderTextColor="#606580"
                value={myStatus}
                onChangeText={setMyStatus}
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleUpdateStatus}
              />
              <TouchableOpacity style={styles.statusSaveBtn} onPress={handleUpdateStatus}>
                <Text style={styles.statusSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Nudges */}
        <Text style={styles.sectionTitle}>Send a Nudge</Text>
        <View style={styles.nudgesRow}>
          <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleSendNudge("❤️ Hug")}>
            <Text style={styles.nudgeBtnEmoji}>❤️</Text>
            <Text style={styles.nudgeBtnText}>Hug</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleSendNudge("🔔 Poke")}>
            <Text style={styles.nudgeBtnEmoji}>🔔</Text>
            <Text style={styles.nudgeBtnText}>Poke</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleSendNudge("☕ Coffee")}>
            <Text style={styles.nudgeBtnEmoji}>☕</Text>
            <Text style={styles.nudgeBtnText}>Coffee?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleSendNudge("🌙 Miss you")}>
            <Text style={styles.nudgeBtnEmoji}>🌙</Text>
            <Text style={styles.nudgeBtnText}>Miss You</Text>
          </TouchableOpacity>
        </View>

        {/* Chores */}
        <View style={styles.choresHeaderRow}>
          <Text style={styles.sectionTitle}>Active Chores</Text>
          <TouchableOpacity style={styles.addTaskBtn} onPress={() => setTaskModalVisible(true)}>
            <Text style={styles.addTaskText}>+ Add Chore</Text>
          </TouchableOpacity>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyChoreBox}>
            <Text style={styles.emptyChoreEmoji}>🎉</Text>
            <Text style={styles.emptyChoreText}>All chores complete!</Text>
            <Text style={styles.emptyChoreSubText}>Head to Rewards to spend your points.</Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((item) => (
              <View key={item.id} style={styles.taskCard}>
                <View style={styles.taskCardMain}>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  <Text style={styles.taskPoints}>🪙 {item.pointsValue} pts</Text>
                </View>
                <TouchableOpacity
                  style={styles.completeTaskBtn}
                  onPress={() => handleCompleteTask(item)}
                >
                  <Text style={styles.completeTaskText}>Done ✓</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Task Creation Modal */}
      <Modal visible={taskModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Household Chore</Text>

            <Text style={styles.modalLabel}>Chore Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Wash the dishes, Buy groceries..."
              placeholderTextColor="#606580"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              returnKeyType="next"
              autoFocus
            />

            <Text style={styles.modalLabel}>Points Value (1 – 100)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10"
              placeholderTextColor="#606580"
              value={newTaskPoints}
              onChangeText={setNewTaskPoints}
              keyboardType="number-pad"
              returnKeyType="done"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewTaskTitle("");
                  setNewTaskPoints("10");
                  setTaskModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleAddTask}>
                <Text style={styles.modalSubmitText}>Add Chore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  coupleLabel: {
    fontSize: 13,
    color: "#A0A5C0",
    marginTop: 3,
  },
  partnerName: {
    color: "#FF5E7E",
    fontWeight: "700",
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  logoutBtnText: {
    color: "#606580",
    fontSize: 12,
    fontWeight: "700",
  },
  dashboardCard: {
    flexDirection: "row",
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 28,
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#A0A5C0",
    marginBottom: 6,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  moodSection: {
    gap: 16,
    marginBottom: 28,
  },
  batteryContainer: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  myBatteryBox: {
    borderColor: "rgba(255,94,126,0.15)",
  },
  batteryLabel: {
    fontSize: 13,
    color: "#A0A5C0",
    fontWeight: "600",
    marginBottom: 10,
  },
  batteryOuter: {
    position: "relative",
    height: 36,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    justifyContent: "center",
  },
  batteryInner: {
    height: "100%",
    borderRadius: 18,
  },
  batteryPercentText: {
    position: "absolute",
    alignSelf: "center",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  batteryStatusText: {
    marginTop: 10,
    fontSize: 13,
    fontStyle: "italic",
    color: "#A0A5C0",
  },
  sliderControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  controlBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 22,
  },
  sliderInstruction: {
    fontSize: 11,
    color: "#606580",
    fontWeight: "600",
  },
  statusInputWrapper: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  statusInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 13,
  },
  statusSaveBtn: {
    backgroundColor: "#FF5E7E",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
  },
  statusSaveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  nudgesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  nudgeBtn: {
    flex: 1,
    backgroundColor: "#131520",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  nudgeBtnEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  nudgeBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#A0A5C0",
  },
  choresHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addTaskBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addTaskText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyChoreBox: {
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  emptyChoreEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyChoreText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyChoreSubText: {
    color: "#606580",
    fontSize: 13,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131520",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  taskCardMain: {
    flex: 1,
    paddingRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5E7E",
  },
  completeTaskBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  completeTaskText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    height: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
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
});
