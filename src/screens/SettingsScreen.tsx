import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Share
} from "react-native";
import { policyText } from "../utils/policyText";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { signOut, updatePassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import * as Notifications from "expo-notifications";
import { auth, db, functions } from "../../firebaseConfig";
import { UserProfile } from "../types";
import { translations } from "../utils/translations";
import {
  ProfileCard,
  PasswordCard,
  PreferencesCard,
  RelationshipCard,
  DangerZone,
} from "../features/settings/components";

const CURRENCIES = ["$", "€", "£", "¥", "RM", "NT$", "HK$"];

export default function SettingsScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [newName, setNewName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [policyVisible, setPolicyVisible] = useState(false);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setUserProfile(data);
        setNewName(data.displayName);
      }
    }, (error) => {
      console.log("[Settings] User profile deleted or unauthorized:", error.message);
    });
    return unsub;
  }, [currentUser]);

  // Load partner profile
  useEffect(() => {
    if (!userProfile?.partnerId) {
      setPartnerProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", userProfile.partnerId), (snap) => {
      setPartnerProfile(snap.data() as UserProfile ?? null);
    }, (error) => {
      console.log("[Settings] Partner profile deleted or unauthorized:", error.message);
    });
    return unsub;
  }, [userProfile?.partnerId]);

  const lang = userProfile?.languagePreference ?? "en";
  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  const localizedLocations = [
    { label: t("deviceLocalTime"), value: "device" },
    { label: t("malaysiaTime"), value: "Malaysia (UTC+8)" },
    { label: t("singaporeTime"), value: "Singapore (UTC+8)" },
    { label: t("londonTime"), value: "London (UTC+0)" },
    { label: t("newYorkTime"), value: "New York (UTC-4)" },
    { label: t("tokyoTime"), value: "Tokyo (UTC+9)" }
  ];

  // Update Name
  const handleUpdateName = async () => {
    if (!currentUser || !newName.trim()) return;
    if (newName.trim().length > 30) {
      Alert.alert(t("authInvalidName"), t("authNameTooLong"));
      return;
    }
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: newName.trim()
      });
      Alert.alert(t("success") + " 🎉", t("nameUpdatedMsg"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("error"), msg);
    } finally {
      setUpdating(false);
    }
  };

  // Update Theme Preference
  const handleToggleTheme = async (selectedTheme: "dark" | "light") => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        themePreference: selectedTheme
      });
    } catch (err: unknown) {
      console.error("[Settings] Toggle theme failed:", err);
    }
  };

  // Update Language Preference
  const handleSelectLanguage = async (selectedLang: "en" | "zh") => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        languagePreference: selectedLang
      });
    } catch (err: unknown) {
      console.error("[Settings] Select language failed:", err);
    }
  };

  // Update Currency Preference
  const handleSelectCurrency = async (curr: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        currencyPreference: curr
      });
    } catch (err: unknown) {
      console.error("[Settings] Select currency failed:", err);
    }
  };

  // Update Timezone Preference
  const handleSelectLocation = async (loc: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        timezoneLocation: loc
      });
      Alert.alert(t("locationSavedTitle"), t("locationSavedMsg"));
    } catch (err: unknown) {
      console.error("[Settings] Select location failed:", err);
    }
  };

  // Unlink Partner
  const handleUnlinkPartner = () => {
    if (!currentUser || !userProfile) return;

    Alert.alert(
      t("unlinkConfirmTitle"),
      t("unlinkConfirmSub"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("settingsUnlinkBtn"),
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              // The callable copies a private snapshot for each partner, then
              // drops the shared group. Clients cannot retarget groupId.
              const unlink = httpsCallable(functions, "unlinkPartner");
              await unlink();
              await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
              Alert.alert(t("unlinkSuccessTitle"), t("unlinkSuccessMsg"));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("error"), msg);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
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
          } catch (err) {
            console.error("[Settings] Logout failed:", err);
          }
        }
      }
    ]);
  };

  // Delete Account (Apple App Store Compliance & GDPR Compliance)
  const handleDeleteAccount = () => {
    if (!currentUser) return;
    const warningMsg = userProfile?.isSolo
      ? (lang === "zh"
          ? "⚠️ 警告：作为个人账号注销，我们将同时永久删除您在云端存储的所有预算账单、待办事项、时光相册和储蓄目标，此操作不可逆。"
          : "⚠️ Warning: As a solo account, deleting your account will permanently erase your group, budget logs, reminders, timeline notes, and savings goals from our cloud servers.")
      : (lang === "zh"
          ? "确定要永久注销您的账号吗？此操作不可逆，且将清除您的个人账户昵称与设置。您的伴侣将会自动回到单人模式。"
          : "Are you sure you want to permanently delete your account? This action is irreversible and will erase your personal profile data. Your partner will automatically return to Solo Mode.");

    Alert.alert(
      t("settingsDeleteConfirmSub"),
      warningMsg,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "确认注销" : "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              const startAccountJob = httpsCallable<{ type: "delete" }, { jobId: string }>(functions, "startAccountJob");
              await startAccountJob({ type: "delete" });
              await signOut(auth);
            } catch (err: any) {
              console.error("[Settings] Account deletion failed:", err);
              if (err.code === "auth/requires-recent-login" || err.message?.includes("RECENT_LOGIN_REQUIRED")) {
                Alert.alert(
                  lang === "zh" ? "需要重新登录" : "Authentication Required",
                  lang === "zh"
                    ? "由于此操作极其敏感，为了安全起见，您必须重新登录后才能注销账号。"
                    : "For security, you must log out and log back in before permanently deleting your account."
                );
              } else {
                Alert.alert(t("error"), err.message || "Failed to delete account");
              }
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  // Export Personal Data (GDPR Article 20 Compliance)
  const handleExportData = async () => {
    if (!currentUser || !userProfile) return;
    setUpdating(true);
    try {
      const startAccountJob = httpsCallable<{ type: "export" }, { jobId: string }>(functions, "startAccountJob");
      const getJobStatus = httpsCallable<{ jobId: string }, { status: string; manifest?: unknown; error?: string }>(functions, "getJobStatus");
      const { data: started } = await startAccountJob({ type: "export" });
      let status: { status: string; manifest?: unknown; error?: string } | null = null;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const result = await getJobStatus({ jobId: started.jobId });
        status = result.data;
        if (status.status === "complete" || status.status === "error") break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!status || status.status !== "complete") {
        throw new Error(status?.error || "Export is still processing. Please try again shortly.");
      }

      const jsonString = JSON.stringify(status.manifest ?? {}, null, 2);

      // Open React Native Share sheet
      await Share.share({
        title: t("settingsExportDataTitle"),
        message: jsonString,
      });

    } catch (err: any) {
      console.error("[Settings] Data export failed:", err);
      Alert.alert(t("error"), err.message || "Failed to export personal data.");
    } finally {
      setUpdating(false);
    }
  };

  // Update Password (Strict Complexity)
  const handleUpdatePassword = async () => {
    if (!currentUser) return;
    if (!newPassword) {
      Alert.alert(t("authWeakPassword"), t("authPleasePassword"));
      return;
    }
    const strictPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-+=\(\)])[A-Za-z\d@$!%*?&._\-+=\(\)]{8,}$/;
    if (!strictPasswordRegex.test(newPassword)) {
      Alert.alert(t("authWeakPassword"), t("authPasswordLength"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t("error"), t("settingsPasswordMismatch"));
      return;
    }

    setPasswordUpdating(true);
    try {
      await updatePassword(currentUser, newPassword);
      Alert.alert(t("success") + " 🎉", t("settingsPasswordUpdated"));
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordChangeOpen(false);
    } catch (err: any) {
      console.error("[Settings] Password update failed:", err);
      if (err.code === "auth/requires-recent-login") {
        Alert.alert(
          lang === "zh" ? "需要重新登录" : "Authentication Required",
          lang === "zh"
            ? "由于修改密码属于敏感操作，为了您的账户安全，您必须重新登录后才能修改密码。"
            : "For security, you must log out and log back in before updating your password."
        );
      } else {
        Alert.alert(t("error"), err.message || "Failed to update password");
      }
    } finally {
      setPasswordUpdating(false);
    }
  };

  const isDark = userProfile?.themePreference !== "light";
  const colors = {
    background: isDark ? "#0A0B10" : "#F8F9FA",
    card: isDark ? "#131520" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1C29",
    subtitle: isDark ? "#A0A5C0" : "#606580",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    activeTab: "#FF5E7E",
    inactiveText: isDark ? "#606580" : "#A0A5C0"
  };

  const activeCurrency = userProfile?.currencyPreference ?? "$";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t("settingsTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>{t("settingsSubtitle")}</Text>
        </View>

        {/* Profile Settings */}
        <ProfileCard
          colors={colors}
          isDark={isDark}
          t={t}
          value={newName}
          onChangeText={setNewName}
          onSave={handleUpdateName}
          updating={updating}
        />
        {/* Change Password Card */}
        <PasswordCard
          colors={colors}
          isDark={isDark}
          t={t}
          open={passwordChangeOpen}
          onToggle={() => setPasswordChangeOpen(!passwordChangeOpen)}
          newPassword={newPassword}
          onChangeNewPassword={setNewPassword}
          confirmPassword={confirmNewPassword}
          onChangeConfirmPassword={setConfirmNewPassword}
          onSubmit={handleUpdatePassword}
          updating={passwordUpdating}
        />
        {/* Preferences Settings */}
        <PreferencesCard
          colors={colors}
          isDark={isDark}
          t={t}
          lang={lang}
          activeCurrency={activeCurrency}
          currencies={CURRENCIES}
          timezone={userProfile?.timezoneLocation}
          locations={localizedLocations}
          onSelectLanguage={handleSelectLanguage}
          onToggleTheme={handleToggleTheme}
          onSelectCurrency={handleSelectCurrency}
          onSelectLocation={handleSelectLocation}
        />
        {/* Account Pairing Status */}
        <RelationshipCard
          colors={colors}
          t={t}
          isSolo={!!userProfile?.isSolo}
          partnerName={partnerProfile?.displayName ?? null}
          onUnlink={handleUnlinkPartner}
          updating={updating}
        />

        {/* Logout / Data & account actions */}
        <DangerZone
          colors={colors}
          isDark={isDark}
          t={t}
          lang={lang}
          updating={updating}
          onLogout={handleLogout}
          onExport={handleExportData}
          onDelete={handleDeleteAccount}
          onOpenPolicy={() => setPolicyVisible(true)}
        />
      </ScrollView>

      {/* Scrollable Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={policyVisible}
        onRequestClose={() => setPolicyVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalContainer}>
            <Text style={styles.policyModalTitle}>
              {lang === "zh" ? "服务条款 & 隐私政策" : "Terms & Privacy Policy"}
            </Text>
            <ScrollView style={styles.policyScrollView} showsVerticalScrollIndicator={true}>
              <Text style={styles.policyBodyText}>
                {policyText[lang]}
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.policyCloseBtn} 
              onPress={() => setPolicyVisible(false)}
            >
              <Text style={styles.policyCloseBtnText}>
                {lang === "zh" ? "确认已阅" : "Close"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: "#FF5E7E",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 12,
  },
  selectorBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  selectorBtnActive: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  selectorBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  selectorBtnTextActive: {
    color: "#FFFFFF",
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  currBtn: {
    width: 52,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  currBtnActive: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  currBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  currBtnTextActive: {
    color: "#FFFFFF",
  },
  statusBox: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  statusSubText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  unlinkBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.2)",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unlinkBtnText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  logoutBtnText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteAccountBtn: {
    height: 52,
    borderWidth: 1,
    backgroundColor: "rgba(255, 59, 48, 0.03)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  deleteAccountBtnText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "700",
  },
  exportDataBtn: {
    height: 52,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  exportDataBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  policyBtn: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  policyBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 16, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  policyModalContainer: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#131520",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  policyModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  policyScrollView: {
    flexGrow: 0,
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
  },
  policyBodyText: {
    fontSize: 13,
    color: "#A0A5C0",
    lineHeight: 20,
  },
  policyCloseBtn: {
    height: 50,
    backgroundColor: "#FF5E7E",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  policyCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  locationList: {
    gap: 8,
  },
  locBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  locBtnActive: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  locBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  locBtnTextActive: {
    fontWeight: "700",
  },
});
