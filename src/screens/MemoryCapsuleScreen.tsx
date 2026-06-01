import React, { useState, useEffect, useRef } from "react";
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
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { doc, onSnapshot, collection, addDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebaseConfig";
import { Milestone, Memory, UserProfile } from "../types";

// Maximum upload sizes
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export default function MemoryCapsuleScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  // Milestone creation
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [newMTitle, setNewMTitle] = useState("");
  const [newMDate, setNewMDate] = useState("");
  const [isCountdown, setIsCountdown] = useState(false);

  // Memory creation
  const [memoryModalVisible, setMemoryModalVisible] = useState(false);
  const [newMemText, setNewMemText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);

  // Use a ref to track if we've auto-selected the first milestone
  // This prevents the stale closure bug when the snapshot re-fires
  const hasAutoSelectedRef = useRef(false);

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      setUserProfile(snap.data() as UserProfile ?? null);
    });
    return unsub;
  }, [currentUser]);

  // Load milestones
  useEffect(() => {
    if (!userProfile?.groupId) return;

    const q = query(
      collection(db, "milestones"),
      where("groupId", "==", userProfile.groupId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const loaded: Milestone[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Milestone))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending
      setMilestones(loaded);

      // Auto-select first milestone only on first load
      if (loaded.length > 0 && !hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true;
        setActiveMilestoneId(loaded[0].id);
      }
    });

    return unsub;
  }, [userProfile?.groupId]);

  // Load memories for active milestone
  useEffect(() => {
    if (!activeMilestoneId) return;

    const q = query(
      collection(db, "memories"),
      where("milestoneId", "==", activeMilestoneId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const loaded: Memory[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Memory))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setMemories(loaded);
    });

    return unsub;
  }, [activeMilestoneId]);

  // Calculate days between a date string and today
  const calculateDays = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleAddMilestone = async () => {
    if (!newMTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a name for this milestone.");
      return;
    }
    if (!newMDate.trim()) {
      Alert.alert("Missing Date", "Please enter a date in YYYY-MM-DD format.");
      return;
    }

    // Validate date format to prevent RangeError crash
    const parsedDate = new Date(newMDate.trim());
    if (isNaN(parsedDate.getTime())) {
      Alert.alert(
        "Invalid Date",
        "Please enter a valid date in YYYY-MM-DD format (e.g. 2025-06-01)."
      );
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "milestones"), {
        groupId: userProfile?.groupId,
        title: newMTitle.trim(),
        date: parsedDate.toISOString(),
        isCountdown: isCountdown,
        themeColor: "#FF5E7E",
        createdAt: new Date().toISOString(),
      });

      setNewMTitle("");
      setNewMDate("");
      setIsCountdown(false);
      setMilestoneModalVisible(false);
      setActiveMilestoneId(docRef.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Error", msg);
    }
  };

  const handlePickMedia = async (type: "image" | "video") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your photos to upload memories.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // Fixed: MediaTypeOptions is deprecated since expo-image-picker v14+
      // New API uses string literals "images" | "videos"
      mediaTypes: type === "image" ? "images" : "videos",
      allowsEditing: type === "image", // Editing not supported for videos
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedMedia(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const handleAddMemory = async () => {
    if (!activeMilestoneId) return;
    if (!newMemText.trim() && !selectedMedia) {
      Alert.alert("Empty Memory", "Please write a note or select a photo/video.");
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
          Alert.alert(
            "File Too Large",
            `Please select a ${mediaType} smaller than ${maxLabel}. Current file is ${(blob.size / (1024 * 1024)).toFixed(1)}MB.`
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
      Alert.alert("Upload Failed", msg);
    } finally {
      setUploading(false);
    }
  };

  const activeMilestone = milestones.find((m) => m.id === activeMilestoneId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Memory Scrapbook</Text>
          <Text style={styles.subtitle}>
            Celebrate milestones and archive your shared videos, photos, and love notes.
          </Text>
        </View>

        {/* Milestones */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Our Milestones</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setMilestoneModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {milestones.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💫</Text>
            <Text style={styles.emptyText}>No milestones yet.</Text>
            <Text style={styles.emptySub}>
              Set your first milestone (e.g. "First Date" or "Next Anniversary") to start counting days!
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
              const diffDays = calculateDays(item.date);
              const isPast = diffDays >= 0;
              const absDays = Math.abs(diffDays);
              const isActive = activeMilestoneId === item.id;

              const dayLabel = item.isCountdown
                ? diffDays < 0
                  ? "days to go"
                  : "days ago"
                : isPast
                ? "days together"
                : "days away";

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.milestoneCard, isActive && styles.activeMilestoneCard]}
                  onPress={() => setActiveMilestoneId(item.id)}
                >
                  <Text style={[styles.mCardTitle, isActive && styles.mCardTitleActive]}>
                    {item.title}
                  </Text>
                  <Text style={styles.mDaysCount}>{absDays.toLocaleString()}</Text>
                  <Text style={styles.mDaysLabel}>{dayLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Memory Feed for active milestone */}
        {activeMilestoneId && (
          <View style={styles.timelineSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {activeMilestone?.title ?? "Capsule"} Feed
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setMemoryModalVisible(true)}
              >
                <Text style={styles.addBtnText}>+ Memory</Text>
              </TouchableOpacity>
            </View>

            {memories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📸</Text>
                <Text style={styles.emptyText}>No memories pinned yet.</Text>
                <Text style={styles.emptySub}>Add your first photo, video, or note!</Text>
              </View>
            ) : (
              <View style={styles.timelineFeed}>
                {memories.map((item) => (
                  <View key={item.id} style={styles.memoryCard}>
                    {/* Image memory */}
                    {item.type === "image" && item.mediaUrl ? (
                      <Image source={{ uri: item.mediaUrl }} style={styles.memoryImage} />
                    ) : null}

                    {/* Video memory — now uses expo-av Video player */}
                    {item.type === "video" && item.mediaUrl ? (
                      <Video
                        source={{ uri: item.mediaUrl }}
                        style={styles.memoryVideo}
                        useNativeControls
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                      />
                    ) : null}

                    <View style={styles.memoryBody}>
                      {/* Only render text if non-empty */}
                      {item.textContent ? (
                        <Text style={styles.memoryText}>"{item.textContent}"</Text>
                      ) : null}
                      <Text style={styles.memoryFooter}>
                        By {item.uploadedBy === currentUser?.uid ? "You" : "Partner"} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Milestone</Text>

            <Text style={styles.modalLabel}>Milestone Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. First Date, Bali Trip, Wedding Day"
              placeholderTextColor="#606580"
              value={newMTitle}
              onChangeText={setNewMTitle}
              autoFocus
            />

            <Text style={styles.modalLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2025-06-01"
              placeholderTextColor="#606580"
              value={newMDate}
              onChangeText={setNewMDate}
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setIsCountdown(!isCountdown)}
            >
              <Text style={styles.toggleText}>Count down to this date (future event)?</Text>
              <View style={[styles.toggleBox, isCountdown && styles.toggleBoxActive]}>
                <Text style={styles.toggleIndicator}>{isCountdown ? "✓" : ""}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewMTitle("");
                  setNewMDate("");
                  setIsCountdown(false);
                  setMilestoneModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleAddMilestone}>
                <Text style={styles.modalSubmitText}>Save Milestone</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pin a Memory</Text>

            <Text style={styles.modalLabel}>Your Note</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: "top", paddingTop: 14 }]}
              placeholder="Write something heartfelt about this moment..."
              placeholderTextColor="#606580"
              value={newMemText}
              onChangeText={setNewMemText}
              multiline
              maxLength={500}
            />

            <Text style={styles.modalLabel}>Attach Media (optional)</Text>
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity
                style={[styles.mediaBtn, mediaType === "image" && selectedMedia && styles.mediaBtnActive]}
                onPress={() => handlePickMedia("image")}
              >
                <Text style={styles.mediaBtnText}>📸 Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaBtn, mediaType === "video" && selectedMedia && styles.mediaBtnActive]}
                onPress={() => handlePickMedia("video")}
              >
                <Text style={styles.mediaBtnText}>📹 Video</Text>
              </TouchableOpacity>
            </View>

            {selectedMedia && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>✓ Media selected</Text>
                {mediaType === "image" ? (
                  <Image source={{ uri: selectedMedia }} style={styles.mediaPreview} />
                ) : (
                  <View style={styles.mediaPreviewPlaceholder}>
                    <Text style={styles.previewIcon}>📹 Video ready to upload</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => setSelectedMedia(null)} style={styles.removeMedia}>
                  <Text style={styles.removeMediaText}>✕ Remove</Text>
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
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, uploading && { opacity: 0.7 }]}
                onPress={handleAddMemory}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Pin Memory</Text>
                )}
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
});
