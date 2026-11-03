import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import type { Memory } from "../../../types";
import type { MemoryColors, MemoryLang, Translator } from "./MemoryColors";
import { MEMORY_LIVE_COLORS } from "./MemoryColors";
import { VideoMemoryPlayer } from "./VideoMemoryPlayer";

export interface MemoryFeedProps {
  colors: MemoryColors;
  lang: MemoryLang;
  t: Translator;
  currentUserId: string | null;
  /** "<Milestone title> Capsule" heading. */
  title: string;
  memories: Memory[];
  onAdd: () => void;
  onOpen: (item: Memory) => void;
}

/** Memory feed for the active milestone (images/video/text cards). */
export function MemoryFeed({
  colors,
  lang,
  t,
  currentUserId,
  title,
  memories,
  onAdd,
  onOpen,
}: MemoryFeedProps) {
  return (
    <View style={styles.timelineSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
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
              onPress={() => onOpen(item)}
              activeOpacity={0.7}
            >
              {item.type === "image" && item.mediaUrl ? (
                <Image source={{ uri: item.mediaUrl }} style={styles.memoryImage} />
              ) : null}

              {item.type === "video" && item.mediaUrl ? (
                <VideoMemoryPlayer uri={item.mediaUrl} />
              ) : null}

              <View style={styles.memoryBody}>
                {item.textContent ? (
                  <Text style={[styles.memoryText, { color: colors.text }]}>
                    {"\u201C"}
                    {item.textContent}
                    {"\u201D"}
                  </Text>
                ) : null}
                <Text style={[styles.memoryFooter, { color: colors.inactiveText }]}>
                  {item.uploadedBy === currentUserId ? t("memByYou") : t("memByPartner")} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={[styles.hintText, { color: colors.inactiveText }]}>{t("memHintTap")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineSection: { marginTop: 32 },
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
  timelineFeed: { gap: 16 },
  memoryCard: {
    backgroundColor: "#131520",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  memoryImage: { width: "100%", height: 200, resizeMode: "cover" },
  memoryBody: { padding: 16 },
  memoryText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    fontStyle: "italic",
    marginBottom: 8,
  },
  memoryFooter: { fontSize: 11, color: "#606580", fontWeight: "500" },
  hintText: { fontSize: 11, color: "#606580", textAlign: "center", marginTop: 8 },
});

export default MemoryFeed;