import React, { useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import { translations } from "../utils/translations";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const [lang, setLang] = useState<"en" | "zh">("en");
  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  const FEATURE_CARDS_EN = [
    {
      icon: "✅",
      title: "Smart Reminders",
      description: "Sync daily tasks instantly. Set custom schedules, toggle all-day lists, and never miss a beat together.",
      accentColor: "rgba(52, 199, 89, 0.08)",
      borderAccent: "rgba(52, 199, 89, 0.15)",
    },
    {
      icon: "💰",
      title: "Shared Finances",
      description: "Track couple budgets and bills in sync. Filter monthly or yearly usage, and monitor your shared pool.",
      accentColor: "rgba(255, 94, 126, 0.08)",
      borderAccent: "rgba(255, 94, 126, 0.15)",
    },
    {
      icon: "💖",
      title: "Memory Scrapbooks",
      description: "Celebrate milestones, countdown to special days, and pin photo/video scrapbooks forever.",
      accentColor: "rgba(90, 120, 255, 0.08)",
      borderAccent: "rgba(90, 120, 255, 0.15)",
    },
  ];

  const FEATURE_CARDS_ZH = [
    {
      icon: "✅",
      title: "智能提醒事项",
      description: "即时同步日常任务。设置自定义日程，切换全天待办，情侣之间心有灵犀。",
      accentColor: "rgba(52, 199, 89, 0.08)",
      borderAccent: "rgba(52, 199, 89, 0.15)",
    },
    {
      icon: "💰",
      title: "情侣共享财务",
      description: "实时共享预算和记账单。支持按月度或年度过滤，并动态追踪剩余资产资金池。",
      accentColor: "rgba(255, 94, 126, 0.08)",
      borderAccent: "rgba(255, 94, 126, 0.15)",
    },
    {
      icon: "💖",
      title: "时光记忆相册",
      description: "共同庆祝每个特殊纪念日，进行倒计时，并永久固定珍贵的照片或视频剪贴簿。",
      accentColor: "rgba(90, 120, 255, 0.08)",
      borderAccent: "rgba(90, 120, 255, 0.15)",
    },
  ];

  const activeFeatures = lang === "zh" ? FEATURE_CARDS_ZH : FEATURE_CARDS_EN;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection Toggle */}
        <View style={styles.langToggleRow}>
          <TouchableOpacity 
            style={[styles.langToggleBtn, lang === "en" && styles.langToggleBtnActive]} 
            onPress={() => setLang("en")}
          >
            <Text style={[styles.langToggleText, lang === "en" && styles.langToggleTextActive]}>EN</Text>
          </TouchableOpacity>
          <Text style={styles.langToggleDivider}>|</Text>
          <TouchableOpacity 
            style={[styles.langToggleBtn, lang === "zh" && styles.langToggleBtnActive]} 
            onPress={() => setLang("zh")}
          >
            <Text style={[styles.langToggleText, lang === "zh" && styles.langToggleTextActive]}>中文</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>{t("welcomeTitle")}</Text>
          <Text style={styles.tagline}>{t("welcomeSubtitle")}</Text>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.cardContainer}>
          {activeFeatures.map((card) => (
            <View
              key={card.title}
              style={[
                styles.card,
                {
                  backgroundColor: card.accentColor,
                  borderColor: card.borderAccent,
                },
              ]}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Auth", { isSignUp: true, initialLang: lang })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t("signUpBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Auth", { isSignUp: false, initialLang: lang })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{t("authSwitchLogIn")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  langToggleRow: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  langToggleBtn: {
    paddingHorizontal: 4,
  },
  langToggleBtnActive: {
    opacity: 1,
  },
  langToggleDivider: {
    color: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 6,
  },
  langToggleText: {
    color: "#606580",
    fontSize: 12,
    fontWeight: "700",
  },
  langToggleTextActive: {
    color: "#FF5E7E",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  logo: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: "#A0A5C0",
    marginTop: 8,
    fontWeight: "500",
  },
  cardContainer: {
    width: "100%",
    marginVertical: 30,
    gap: 14,
  },
  card: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: "#A0A5C0",
    lineHeight: 20,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 10,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#FF5E7E",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5E7E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "transparent",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  secondaryButtonText: {
    color: "#A0A5C0",
    fontSize: 16,
    fontWeight: "600",
  },
});
