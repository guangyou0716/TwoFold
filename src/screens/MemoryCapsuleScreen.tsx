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
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import DateTimePicker from "@react-native-community/datetimepicker";
import { doc, onSnapshot, collection, addDoc, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebaseConfig";
import { Milestone, Memory, UserProfile } from "../types";
import { translations } from "../utils/translations";


// Maximum upload sizes
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// A sub-component to handle dynamic video player hooks in lists
function VideoMemoryPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = false;
  });

  return (
    <VideoView
      style={styles.memoryVideo}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

export default function MemoryCapsuleScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const lang = userProfile?.languagePreference ?? "en";
  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  // Milestone creation
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [newMTitle, setNewMTitle] = useState("");
  const [newMDate, setNewMDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCountdown, setIsCountdown] = useState(false);

  // Memory creation
  const [memoryModalVisible, setMemoryModalVisible] = useState(false);
  const [newMemText, setNewMemText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);

  // Edit Memory Modal
  const [editMemoryModalVisible, setEditMemoryModalVisible] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [editMemoryText, setEditMemoryText] = useState("");

  // Use a ref to track if we've auto-selected the first milestone
  const hasAutoSelectedRef = useRef(false);

  // Self-healing listener retry trigger for permission-denied race conditions
  const [retryTrigger, setRetryTrigger] = useState(0);


  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setUserProfile(data);
      }
    }, (error) => {
      console.log("[MemoryCapsule] User profile listener error:", error.message);
    });
    return unsub;
  }, [currentUser]);

  // Load milestones
  useEffect(() => {
    if (!userProfile?.groupId) return;

    let isCleanedUp = false;

    const q = query(
      collection(db, "milestones"),
      where("groupId", "==", userProfile.groupId)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (isCleanedUp) return;
      const loaded: Milestone[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Milestone))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending
      setMilestones(loaded);

      // Auto-select first milestone only on first load
      if (loaded.length > 0 && !hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true;
        setActiveMilestoneId(loaded[0].id);
      }
    }, (error) => {
      console.log("[MemoryCapsule] Milestones listener error:", error.message);
      if (!isCleanedUp) {
        setTimeout(() => {
          setRetryTrigger(prev => prev + 1);
        }, 1500);
      }
    });

    return () => {
      isCleanedUp = true;
      unsub();
    };
  }, [userProfile?.groupId, retryTrigger]);

  // Load memories for active milestone
  useEffect(() => {
    if (!activeMilestoneId || !userProfile?.groupId) return;

    let isCleanedUp = false;

    const q = query(
      collection(db, "memories"),
      where("milestoneId", "==", activeMilestoneId),
      where("groupId", "==", userProfile.groupId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (isCleanedUp) return;
        const loaded: Memory[] = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Memory))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setMemories(loaded);
      },
      (err) => {
        console.error("[MemoryCapsule] Load memories error:", err);
        if (!isCleanedUp) {
          setTimeout(() => {
            setRetryTrigger(prev => prev + 1);
          }, 1500);
        }
      }
    );

    return () => {
      isCleanedUp = true;
      unsub();
    };
  }, [activeMilestoneId, userProfile?.groupId, retryTrigger]);

  // Calculate days between a date string and today
  const calculateDays = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMilestoneValues = (m: Milestone) => {
    const diffDays = calculateDays(m.date);
    const absDays = Math.abs(diffDays);
    
    if (diffDays === 0) {
      return {
        countText: lang === "zh" ? "今天！🎂" : "Today! 🎂",
        labelText: ""
      };
    }
    
    const labelText = m.isCountdown
      ? diffDays < 0
        ? (lang === "zh" ? "剩余" : "to go")
        : (lang === "zh" ? "以前" : "ago")
      : (lang === "zh" ? "相伴" : "together");
      
    const years = Math.floor(absDays / 365);
    const days = absDays % 365;
    
    const countText = lang === "zh"
      ? `${years > 0 ? years + "年" : ""}${days}天`
      : years > 0 
        ? `${years} yr${years > 1 ? "s" : ""} ${days} d${days !== 1 ? "s" : ""}`
        : `${days} day${days !== 1 ? "s" : ""}`;
      
    return {
      countText,
      labelText
    };
  };


  const handleEditMilestone = (item: Milestone) => {
    setEditingMilestone(item);
    setNewMTitle(item.title);
    setNewMDate(new Date(item.date));
    setIsCountdown(item.isCountdown);
    setMilestoneModalVisible(true);
  };

  const handleCloseMilestoneModal = () => {
    setNewMTitle("");
    setNewMDate(new Date());
    setIsCountdown(false);
    setEditingMilestone(null);
    setMilestoneModalVisible(false);
  };

  const handleSaveMilestone = async () => {
    if (!newMTitle.trim()) {
      Alert.alert(lang === "zh" ? "缺少标题" : "Missing Title", lang === "zh" ? "请输入里程碑名称。" : "Please enter a name for this milestone.");
      return;
    }

    try {
      const milestoneData = {
        title: newMTitle.trim(),
        date: newMDate.toISOString(),
        isCountdown,
      };

      if (editingMilestone) {
        await updateDoc(doc(db, "milestones", editingMilestone.id), milestoneData);
        Alert.alert(t("success") + " 🎉", lang === "zh" ? "里程碑已成功更新。" : "Milestone updated successfully.");
      } else {
        const docRef = await addDoc(collection(db, "milestones"), {
          ...milestoneData,
          groupId: userProfile?.groupId ?? "solo",
          themeColor: "#FF5E7E",
          createdAt: new Date().toISOString()
        });
        setActiveMilestoneId(docRef.id);
        Alert.alert(t("success") + " 🎉", lang === "zh" ? "里程碑已成功创建。" : "Milestone created successfully.");
      }

      handleCloseMilestoneModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("budgetFailedSave"), msg);
    }
  };

  const handleDeleteMilestone = (m: Milestone) => {
    Alert.alert(
      t("deleteMilestoneTitle"),
      lang === "zh"
        ? `确定要永久删除里程碑“${m.title}”吗？这也会将其从您的时间轴中移除。`
        : `Are you sure you want to permanently delete "${m.title}"? This will also remove the milestone from your timeline.`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "milestones", m.id));
              if (activeMilestoneId === m.id) {
                setActiveMilestoneId(null);
              }
              handleCloseMilestoneModal();
              Alert.alert(lang === "zh" ? "已删除" : "Deleted", lang === "zh" ? "里程碑已移除。" : "Milestone removed.");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("budgetFailedDelete"), msg);
            }
          }
        }
      ]
    );
  };


  const handlePickMedia = async (type: "image" | "video") => {
    if (lang === "zh") {
      Alert.alert("即将上线 🚀", "为了节省免费云存储额度，照片/视频媒体上传功能目前已禁用，将在后续开发版本中上线。");
    } else {
      Alert.alert("Coming Soon 🚀", "To conserve free cloud storage quotas, photo/video media uploads are currently disabled and will be released in a future development update.");
    }
  };

  const handleAddMemory = async () => {
    if (!activeMilestoneId) return;
    if (!newMemText.trim() && !selectedMedia) {
      Alert.alert(t("memEmptyMemory"), t("memPleaseWrite"));
      return;
    }

    setUploading(true);
    let finalMediaUrl = "";

    try {
      if (selectedMedia) {
        // Fetch and check file size before uploading
        const response = await fetch(selectedMedia);
        const blob = await response.blob();
        const maxSize = mediaType === "video" ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
        const maxLabel = mediaType === "video" ? "50MB" : "5MB";

        if (blob.size > maxSize) {
          const typeLabel = mediaType === "video"
            ? (lang === "zh" ? "视频" : "video")
            : (lang === "zh" ? "图片" : "image");
          Alert.alert(
            t("memFileTooLarge"),
            t("memLimitMessage")
              .replace("{type}", typeLabel)
              .replace("{limit}", maxLabel)
              .replace("{size}", (blob.size / (1024 * 1024)).toFixed(1))
          );
          setUploading(false);
          return;
        }

        const fileRef = ref(
          storage,
          `memories/${activeMilestoneId}/${Date.now()}_${mediaType}`
        );
        await uploadBytes(fileRef, blob);
        finalMediaUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "memories"), {
        milestoneId: activeMilestoneId,
        groupId: userProfile?.groupId,
        type: selectedMedia ? mediaType : "text",
        mediaUrl: finalMediaUrl || null,
        textContent: newMemText.trim(),
        uploadedBy: currentUser?.uid,
        createdAt: new Date().toISOString(),
      });

      setNewMemText("");
      setSelectedMedia(null);
      setMemoryModalVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      Alert.alert(t("memUploadFailed"), msg);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEditMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setEditMemoryText(memory.textContent);
    setEditMemoryModalVisible(true);
  };

  const handleUpdateMemory = async () => {
    if (!selectedMemory) return;
    try {
      await updateDoc(doc(db, "memories", selectedMemory.id), {
        textContent: editMemoryText.trim()
      });
      setEditMemoryModalVisible(false);
      setSelectedMemory(null);
      Alert.alert(t("success") + " 🎉", t("memMemoryUpdated"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("memUpdateFailed"), msg);
    }
  };


  const handleDeleteMemory = (memoryToDelete?: Memory) => {
    const target = memoryToDelete || selectedMemory;
    if (!target) return;

    Alert.alert(
      lang === "zh" ? "删除记忆？" : "Delete Memory?",
      lang === "zh" ? "确定要永久删除这条记忆吗？此操作无法撤销。" : "Are you sure you want to permanently delete this memory? This cannot be undone.",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "memories", target.id));
              setEditMemoryModalVisible(false);
              setSelectedMemory(null);
              Alert.alert(t("memDeletedTitle"), t("memDeleteSuccess"));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("budgetFailedDelete"), msg);
            }
          }
        }
      ]
    );
  };


  const activeMilestone = milestones.find((m) => m.id === activeMilestoneId);

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
    placeholderText: isDark ? "#606580" : "#A0A5C0",
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t("memTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            {t("memSubtitle")}
          </Text>
        </View>

        {/* Milestones */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("memOurMilestones")}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setMilestoneModalVisible(true)}>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.milestoneScroll}
            nestedScrollEnabled
          >
            {milestones.map((item) => {
              const isActive = activeMilestoneId === item.id;
              const { countText, labelText } = getMilestoneValues(item);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.milestoneCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && styles.activeMilestoneCard
                  ]}
                  onPress={() => setActiveMilestoneId(item.id)}
                  onLongPress={() => handleEditMilestone(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.mCardTitle,
                    { color: colors.subtitle },
                    isActive && styles.mCardTitleActive
                  ]}>
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
        )}
        {milestones.length > 0 && (
          <Text style={styles.longPressHint}>
            {t("memLongPressHint")}
          </Text>
        )}

        {/* Memory Feed for active milestone */}
        {activeMilestoneId && (
          <View style={styles.timelineSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {activeMilestone?.title ?? (lang === "zh" ? "胶囊" : "Capsule")} {t("memFeed")}
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setMemoryModalVisible(true)}
              >
                <Text style={styles.addBtnText}>+ {lang === "zh" ? "记忆" : "Memory"}</Text>
              </TouchableOpacity>
            </View>

            {memories.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.emptyEmoji}>📸</Text>
                <Text style={[styles.emptyText, { color: colors.text }]}>{t("memNoMemoriesTitle")}</Text>
                <Text style={[styles.emptySub, { color: colors.subtitle }]}>{t("memNoMemoriesSub")}</Text>
              </View>

            ) : (
              <View style={styles.timelineFeed}>
                {memories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.memoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleOpenEditMemory(item)}
                    activeOpacity={0.7}
                  >
                    {/* Image memory */}
                    {item.type === "image" && item.mediaUrl ? (
                      <Image source={{ uri: item.mediaUrl }} style={styles.memoryImage} />
                    ) : null}

                    {/* Video memory — now uses the modern expo-video player */}
                    {item.type === "video" && item.mediaUrl ? (
                      <VideoMemoryPlayer uri={item.mediaUrl} />
                    ) : null}

                    <View style={styles.memoryBody}>
                      {/* Only render text if non-empty */}
                      {item.textContent ? (
                        <Text style={[styles.memoryText, { color: colors.text }]}>"{item.textContent}"</Text>
                      ) : null}
                      <Text style={[styles.memoryFooter, { color: colors.inactiveText }]}>
                        {item.uploadedBy === currentUser?.uid ? t("memByYou") : t("memByPartner")} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.hintText, { color: colors.inactiveText, textAlign: "center", marginTop: 8 }]}>
                  {t("memHintTap")}
                </Text>
              </View>

            )}
          </View>
        )}
      </ScrollView>

      {/* Add Milestone Modal */}
      <Modal visible={milestoneModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingMilestone ? t("memEditMilestone") : t("memAddMilestone")}</Text>

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("memName")}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder={t("memPlaceholderName")}
              placeholderTextColor={colors.placeholderText}
              value={newMTitle}
              onChangeText={setNewMTitle}
              autoFocus
            />

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("memDate")}</Text>
            <TouchableOpacity
              style={[styles.datePickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.datePickerTriggerText, { color: colors.text }]}>
                📅 {newMDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && Platform.OS === "ios" ? (
              <Modal visible={showDatePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.modalTitle, { color: colors.text, textAlign: "center" }]}>{t("memSelectDate")}</Text>
                    <DateTimePicker
                      value={newMDate}
                      mode="date"
                      display="spinner"
                      themeVariant={isDark ? "dark" : "light"}
                      textColor={colors.text}
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setNewMDate(selectedDate);
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.modalSubmit, { marginTop: 16, alignItems: "center" }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.modalSubmitText}>{t("memConfirm")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : showDatePicker ? (
              <DateTimePicker
                value={newMDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setNewMDate(selectedDate);
                  }
                }}
              />
            ) : null}

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsCountdown(!isCountdown)}
            >
              <Text style={[styles.toggleText, { color: colors.subtitle }]}>{t("memCountdownToggle")}</Text>
              <View style={[styles.toggleBox, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }, isCountdown && styles.toggleBoxActive]}>
                <Text style={styles.toggleIndicator}>{isCountdown ? "✓" : ""}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              {editingMilestone && (
                <TouchableOpacity
                  style={[styles.modalDeleteBtn, { marginRight: "auto" }]}
                  onPress={() => handleDeleteMilestone(editingMilestone)}
                >
                  <Text style={styles.modalDeleteText}>{t("memDelete")}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={handleCloseMilestoneModal}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveMilestone}>
                <Text style={styles.modalSubmitText}>{editingMilestone ? (lang === "zh" ? "更新" : "Update") : t("memSaveMilestone")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Add Memory Modal */}
      <Modal visible={memoryModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("memAddMemoryTitle")}</Text>

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("memWriteNote")}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, height: 80, textAlignVertical: "top", paddingTop: 14 }]}
              placeholder={t("memPlaceholderNote")}
              placeholderTextColor={colors.placeholderText}
              value={newMemText}
              onChangeText={setNewMemText}
              multiline
              maxLength={500}
            />

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{lang === "zh" ? "添加媒体 (后续开发上线)" : "Attach Media (Future Development)"}</Text>
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.mediaBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                  mediaType === "image" && selectedMedia && styles.mediaBtnActive
                ]}
                onPress={() => handlePickMedia("image")}
              >
                <Text style={[styles.mediaBtnText, { color: colors.subtitle }, mediaType === "image" && selectedMedia && { color: "#FF5E7E" }]}>{t("memPhoto")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mediaBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                  mediaType === "video" && selectedMedia && styles.mediaBtnActive
                ]}
                onPress={() => handlePickMedia("video")}
              >
                <Text style={[styles.mediaBtnText, { color: colors.subtitle }, mediaType === "video" && selectedMedia && { color: "#FF5E7E" }]}>{t("memVideo")}</Text>
              </TouchableOpacity>
            </View>

            {selectedMedia && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>{t("memMediaSelected")}</Text>
                {mediaType === "image" ? (
                  <Image source={{ uri: selectedMedia }} style={styles.mediaPreview} />
                ) : (
                  <View style={[styles.mediaPreviewPlaceholder, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Text style={[styles.previewIcon, { color: colors.subtitle }]}>{t("memVideoReady")}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => setSelectedMedia(null)} style={styles.removeMedia}>
                  <Text style={[styles.removeMediaText, { color: colors.inactiveText }]}>{t("memRemove")}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewMemText("");
                  setSelectedMedia(null);
                  setMemoryModalVisible(false);
                }}
                disabled={uploading}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, uploading && { opacity: 0.7 }]}
                onPress={handleAddMemory}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t("memPinBtn")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Edit Memory Modal */}
      <Modal visible={editMemoryModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("memEditMemory")}</Text>

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("memWriteNote")}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, height: 80, textAlignVertical: "top", paddingTop: 14 }]}
              value={editMemoryText}
              onChangeText={setEditMemoryText}
              multiline
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { marginRight: "auto" }]}
                onPress={() => handleDeleteMemory()}
              >
                <Text style={{ color: "#FF3B30", fontSize: 14, fontWeight: "700" }}>{t("memDelete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setEditMemoryText("");
                  setSelectedMemory(null);
                  setEditMemoryModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleUpdateMemory}
              >
                <Text style={styles.modalSubmitText}>{lang === "zh" ? "保存" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    color: "#A0A5C0",
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addBtnText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySub: {
    color: "#606580",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  milestoneScroll: {
    gap: 12,
    paddingRight: 20,
  },
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
    borderColor: "#FF5E7E",
    backgroundColor: "rgba(255,94,126,0.07)",
  },
  mCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A5C0",
    textAlign: "center",
    marginBottom: 8,
  },
  mCardTitleActive: {
    color: "#FF5E7E",
  },
  mDaysCount: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  mDaysLabel: {
    fontSize: 10,
    color: "#606580",
    marginTop: 4,
    fontWeight: "600",
  },
  timelineSection: {
    marginTop: 32,
  },
  timelineFeed: {
    gap: 16,
  },
  memoryCard: {
    backgroundColor: "#131520",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  memoryImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  memoryVideo: {
    width: "100%",
    height: 200,
  },
  memoryBody: {
    padding: 16,
  },
  memoryText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    fontStyle: "italic",
    marginBottom: 8,
  },
  memoryFooter: {
    fontSize: 11,
    color: "#606580",
    fontWeight: "500",
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
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
    height: 50,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  toggleText: {
    color: "#A0A5C0",
    fontSize: 13,
    fontWeight: "600",
    width: "82%",
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBoxActive: {
    borderColor: "#FF5E7E",
    backgroundColor: "#FF5E7E",
  },
  toggleIndicator: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  mediaButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  mediaBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  mediaBtnActive: {
    borderColor: "rgba(255,94,126,0.4)",
    backgroundColor: "rgba(255,94,126,0.08)",
  },
  mediaBtnText: {
    color: "#A0A5C0",
    fontSize: 13,
    fontWeight: "600",
  },
  previewContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "700",
    marginBottom: 8,
  },
  mediaPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  mediaPreviewPlaceholder: {
    width: 120,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  previewIcon: {
    fontSize: 12,
    color: "#A0A5C0",
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  removeMedia: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  removeMediaText: {
    fontSize: 12,
    color: "#606580",
    fontWeight: "600",
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
    minWidth: 100,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalDeleteText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
  longPressHint: {
    fontSize: 11,
    color: "#606580",
    textAlign: "center",
    marginTop: 8,
  },
  datePickerTrigger: {
    height: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  datePickerTriggerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  hintText: {
    fontSize: 11,
    color: "#606580",
  },
});
