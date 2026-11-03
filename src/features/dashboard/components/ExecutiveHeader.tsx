import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { DashboardColors, DashboardLang, Translator } from "./DashboardColors";

export interface ExecutiveHeaderProps {
  colors: DashboardColors;
  t: Translator;
  lang: DashboardLang;
  displayName: string | null;
  partnerName: string | null;
  isSolo: boolean;
  onLogout: () => void;
  onLinkPartner: () => void;
}

/** L2-friendly executive header: greeting, partner/solo status, logout. */
export function ExecutiveHeader({
  colors,
  t,
  lang,
  displayName,
  partnerName,
  isSolo,
  onLogout,
  onLinkPartner,
}: ExecutiveHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {t("dashGreeting")}
          {displayName ?? "…"} 👋
        </Text>
        {isSolo ? (
          <TouchableOpacity
            style={styles.linkPartnerHeaderBtn}
            onPress={onLinkPartner}
            activeOpacity={0.7}
          >
            <Text style={styles.linkPartnerHeaderText}>{t("dashSoloMode")}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.coupleLabel, { color: colors.subtitle }]}>
            {t("dashConnectedWith")}
            <Text style={styles.partnerName}>{partnerName ?? "…"}</Text>
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>{lang === "zh" ? "退出" : "Logout"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

export default ExecutiveHeader;