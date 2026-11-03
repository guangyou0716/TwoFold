import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import { writeBatch, doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { auth, db, functions } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { translations } from "../utils/translations";

type PairingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Pairing">;
};

export default function PairingScreen({ navigation }: PairingScreenProps) {
  const currentUser = auth.currentUser;
  const [languagePreference, setLanguagePreference] = useState<"en" | "zh">("en");
  const [partnerCode, setPartnerCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load language preference
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data();
      if (data?.languagePreference) {
        setLanguagePreference(data.languagePreference as "en" | "zh");
      }
    }, (error) => {
      console.log("[Pairing] User profile listener error:", error.message);
    });
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    const loadInvite = async () => {
      if (!currentUser) return;
      setInviteLoading(true);
      try {
        const createInvite = httpsCallable<undefined, { code: string }>(functions, "createInvite");
        const result = await createInvite();
        if (active) setInviteCode(result.data.code);
      } catch (error) {
        console.error("[Pairing] Invite creation failed:", error);
        if (active) setInviteCode(null);
      } finally {
        if (active) setInviteLoading(false);
      }
    };

    void loadInvite();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const lang = languagePreference;
  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  // Cleanup any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // The RootNavigator handles auto-redirect when groupId/partnerId are set.
  // We do NOT subscribe to onSnapshot here — the RootNavigator handles it globally.
  // This avoids the double-redirect race condition.

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

  const shareCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: t("pairShareMsg").replace("{code}", inviteCode),
        title: t("pairShareTitle"),
      });
    } catch {
      // Share cancelled or failed — no action needed
    }
  };

  const handleConnect = async () => {
    if (!currentUser) return;
    const cleanedCode = partnerCode.trim();

    if (!cleanedCode) {
      Alert.alert(t("pairInvalidCode"), t("pairPleaseCode"));
      return;
    }

    setLoading(true);
    try {
      const claimInvite = httpsCallable<{ code: string }, unknown>(functions, "claimInvite");
      await claimInvite({ code: cleanedCode });

      // RootNavigator will detect the pairing and redirect automatically.
      // We do not show a blocking native Alert here, as it can deadlock
      // the screen transition during unmounting.
      console.info("[Pairing] Successfully connected with partner!");
    } catch (error: unknown) {
      console.error("[Pairing] Error during pairing transaction:", error);
      if (error instanceof Error) {
        if (error.message.includes("INVALID_INVITE")) {
          Alert.alert(t("pairInvalidCode"), t("pairPleaseCode"));
        } else if (error.message.includes("Already paired")) {
          Alert.alert(t("error"), "You are already linked with a partner.");
        } else if (error.message.includes("CREATOR_ALREADY_PAIRED")) {
          Alert.alert(t("pairPartnerAlreadyPairedTitle"), t("pairPartnerAlreadyPairedMsg"));
        } else if (error.message.includes("INVITE_USED") || error.message.includes("INVITE_EXPIRED")) {
          Alert.alert(t("pairInvalidCode"), error.message.includes("INVITE_USED") ? "This invite has already been used." : "This invite has expired.");
        } else {
          Alert.alert(t("pairFailedTitle"), error.message);
        }
      } else {
        Alert.alert(t("pairFailedTitle"), "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySolo = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const soloGroupId = `solo_${currentUser.uid}`;
      const batch = writeBatch(db);

      // Create a solo group document
      batch.set(doc(db, "groups", soloGroupId), {
        groupId: soloGroupId,
        partnerAId: currentUser.uid,
        partnerBId: "",
        balances: {
          [currentUser.uid]: 0,
        },
        streaks: {
          choreStreak: 0,
          lastChoreDate: null,
        },
        createdAt: new Date().toISOString(),
      });

      // Update current user to use the solo group and mark as solo
      batch.update(doc(db, "users", currentUser.uid), {
        groupId: soloGroupId,
        partnerId: "",
        isSolo: true,
      });

      await batch.commit();
      // RootNavigator will redirect automatically.
      console.info("[Pairing] Successfully started Solo Mode!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      Alert.alert(t("pairSoloFailedTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t("logoutConfirmTitle"), t("logoutConfirmMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("settingsLogoutBtn"),
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("[PairingScreen] Logout failed:", error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t("pairTitle")}</Text>
          <Text style={styles.subtitle}>
            {t("pairSubtitle")}
          </Text>

          {/* User's Own Invite Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t("pairYourPersonalCode")}</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} numberOfLines={1} ellipsizeMode="middle">
                {inviteLoading ? t("pairLoading") : inviteCode ?? t("pairInvalidCode")}
              </Text>
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity
                style={styles.codeActionBtn}
                onPress={copyToClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.codeActionText}>
                  {copied ? (lang === "zh" ? "✓ 已复制！" : "✓ Copied!") : t("pairCopyBtn")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.codeActionBtn, styles.codeActionPrimary]}
                onPress={shareCode}
                activeOpacity={0.7}
              >
                <Text style={[styles.codeActionText, styles.codeActionTextPrimary]}>
                  {t("pairShareBtn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{lang === "zh" ? "或者" : "OR"}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Enter Partner's Invite Code */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("pairEnterPartner")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("pairPlaceholder")}
              placeholderTextColor="#606580"
              value={partnerCode}
              onChangeText={(value) => setPartnerCode(value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleConnect}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.connectButton, loading && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.connectButtonText}>{t("pairConnectAndPlayBtn")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.soloButton, loading && styles.soloButtonDisabled]}
            onPress={handlePlaySolo}
            disabled={loading}
          >
            <Text style={styles.soloButtonText}>{t("pairPlaySoloBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.logoutButtonText}>{t("logoutConfirmTitle")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#A0A5C0",
    marginBottom: 32,
    lineHeight: 22,
  },
  codeContainer: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeBox: {
    backgroundColor: "rgba(255, 94, 126, 0.05)",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 94, 126, 0.12)",
    marginBottom: 12,
  },
  codeText: {
    color: "#FF5E7E",
    fontSize: 14,
    fontWeight: "700",
  },
  codeActions: {
    flexDirection: "row",
    gap: 10,
  },
  codeActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  codeActionPrimary: {
    backgroundColor: "rgba(255, 94, 126, 0.1)",
    borderColor: "rgba(255, 94, 126, 0.2)",
  },
  codeActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A5C0",
  },
  codeActionTextPrimary: {
    color: "#FF5E7E",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dividerText: {
    color: "#606580",
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    height: 56,
    backgroundColor: "#131520",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  connectButton: {
    height: 56,
    backgroundColor: "#FF5E7E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5E7E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutButton: {
    alignItems: "center",
    marginTop: 20,
    padding: 12,
  },
  logoutButtonText: {
    color: "#606580",
    fontSize: 14,
    fontWeight: "600",
  },
  soloButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "transparent",
  },
  soloButtonDisabled: {
    opacity: 0.5,
  },
  soloButtonText: {
    color: "#A0A5C0",
    fontSize: 16,
    fontWeight: "700",
  },
});
