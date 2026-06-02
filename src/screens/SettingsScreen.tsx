import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { UserProfile } from "../types";
import { translations } from "../utils/translations";

const CURRENCIES = ["$", "€", "£", "¥", "RM", "NT$", "HK$"];

export default function SettingsScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [newName, setNewName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setUserProfile(data);
        setNewName(data.displayName);
      }
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
              const batch = writeBatch(db);

              // 1. Reset own profile
              batch.update(doc(db, "users", currentUser.uid), {
                partnerId: "",
                groupId: "",
                isSolo: true
              });

              // 2. Reset partner's profile if linked
              if (userProfile.partnerId) {
                batch.update(doc(db, "users", userProfile.partnerId), {
                  partnerId: "",
                  groupId: "",
                  isSolo: true
                });
              }

              await batch.commit();
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsProfileOptions")}</Text>
          
          <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsDisplayName")}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", color: colors.text, borderColor: colors.border }]}
            value={newName}
            onChangeText={setNewName}
            placeholder={t("authYourName")}
            placeholderTextColor={colors.inactiveText}
            maxLength={30}
          />

          <TouchableOpacity
            style={[styles.submitBtn, updating && styles.disabledBtn]}
            onPress={handleUpdateName}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t("settingsSaveDisplayName")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preferences Settings */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsAppPreferences")}</Text>

          {/* Language Selector */}
          <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsLanguage")}</Text>
          <View style={[styles.selectorRow, { marginBottom: 16 }]}>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                lang === "en" && styles.selectorBtnActive,
                { borderColor: colors.border }
              ]}
              onPress={() => handleSelectLanguage("en")}
            >
              <Text style={[styles.selectorBtnText, lang === "en" && styles.selectorBtnTextActive, { color: lang === "en" ? "#FFFFFF" : colors.inactiveText }]}>
                {t("settingsEnglish")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                lang === "zh" && styles.selectorBtnActive,
                { borderColor: colors.border }
              ]}
              onPress={() => handleSelectLanguage("zh")}
            >
              <Text style={[styles.selectorBtnText, lang === "zh" && styles.selectorBtnTextActive, { color: lang === "zh" ? "#FFFFFF" : colors.inactiveText }]}>
                {t("settingsChinese")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Theme Selector */}
          <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsThemeStyle")}</Text>
          <View style={styles.selectorRow}>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                isDark && styles.selectorBtnActive,
                { borderColor: colors.border }
              ]}
              onPress={() => handleToggleTheme("dark")}
            >
              <Text style={[styles.selectorBtnText, isDark && styles.selectorBtnTextActive, { color: isDark ? "#FFFFFF" : colors.inactiveText }]}>
                {t("settingsDarkMode")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                !isDark && styles.selectorBtnActive,
                { borderColor: colors.border }
              ]}
              onPress={() => handleToggleTheme("light")}
            >
              <Text style={[styles.selectorBtnText, !isDark && styles.selectorBtnTextActive, { color: !isDark ? "#FFFFFF" : colors.inactiveText }]}>
                {t("settingsLightMode")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Currency Selector */}
          <Text style={[styles.label, { color: colors.subtitle, marginTop: 16 }]}>{t("settingsSharedCurrency")}</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((curr) => {
              const isActive = activeCurrency === curr;
              return (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currBtn,
                    isActive && styles.currBtnActive,
                    { borderColor: colors.border }
                  ]}
                  onPress={() => handleSelectCurrency(curr)}
                >
                  <Text style={[styles.currBtnText, isActive && styles.currBtnTextActive, { color: isActive ? "#FFFFFF" : colors.text }]}>
                    {curr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location / Timezone Selector */}
          <Text style={[styles.label, { color: colors.subtitle, marginTop: 16 }]}>{t("settingsReminderTimezone")}</Text>
          <View style={styles.locationList}>
            {localizedLocations.map((loc) => {
              const isActive = (userProfile?.timezoneLocation ?? "device") === loc.value;
              return (
                <TouchableOpacity
                  key={loc.value}
                  style={[
                    styles.locBtn,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                    isActive && styles.locBtnActive
                  ]}
                  onPress={() => handleSelectLocation(loc.value)}
                >
                  <Text style={[styles.locBtnText, isActive && styles.locBtnTextActive, { color: isActive ? "#FFFFFF" : colors.text }]}>
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account Pairing Status */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsRelationshipStatus")}</Text>
          {userProfile?.isSolo ? (
            <View style={styles.statusBox}>
              <Text style={[styles.statusText, { color: colors.text }]}>{t("settingsSoloActive")}</Text>
              <Text style={[styles.statusSubText, { color: colors.subtitle }]}>
                {t("settingsSoloSub")}
              </Text>
            </View>
          ) : (
            <View style={styles.statusBox}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {t("settingsConnectedWithPartner")}{partnerProfile?.displayName ?? "Your Partner"}
              </Text>
              <Text style={[styles.statusSubText, { color: colors.subtitle }]}>
                {t("settingsConnectedSub")}
              </Text>
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={handleUnlinkPartner}
                disabled={updating}
              >
                <Text style={styles.unlinkBtnText}>{t("settingsUnlinkBtn")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>{t("settingsLogoutBtn")}</Text>
        </TouchableOpacity>

      </ScrollView>
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
