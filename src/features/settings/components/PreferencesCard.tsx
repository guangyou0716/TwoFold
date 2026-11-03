import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { LocationOption, SettingsColors, SettingsLang, Translator } from "./SettingsColors";
import { SETTINGS_LIVE_COLORS } from "./SettingsColors";

export interface PreferencesCardProps {
  colors: SettingsColors;
  isDark: boolean;
  t: Translator;
  lang: SettingsLang;
  activeCurrency: string;
  currencies: string[];
  timezone: string | undefined;
  locations: LocationOption[];
  onSelectLanguage: (lang: SettingsLang) => void;
  onToggleTheme: (theme: "dark" | "light") => void;
  onSelectCurrency: (currency: string) => void;
  onSelectLocation: (location: string) => void;
}

/** Language / theme / currency / timezone preferences card. */
export function PreferencesCard({
  colors,
  isDark,
  t,
  lang,
  activeCurrency,
  currencies,
  timezone,
  locations,
  onSelectLanguage,
  onToggleTheme,
  onSelectCurrency,
  onSelectLocation,
}: PreferencesCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{t("settingsAppPreferences")}</Text>

      {/* Language Selector */}
      <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsLanguage")}</Text>
      <View style={[styles.selectorRow, { marginBottom: 16 }]}>
        {(["en", "zh"] as const).map((code) => (
          <TouchableOpacity
            key={code}
            style={[
              styles.selectorBtn,
              { borderColor: colors.border },
              lang === code && styles.selectorBtnActive,
            ]}
            onPress={() => onSelectLanguage(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: lang === code }}
          >
            <Text style={[styles.selectorBtnText, { color: lang === code ? "#FFFFFF" : colors.inactiveText }]}>
              {code === "en" ? t("settingsEnglish") : t("settingsChinese")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme Selector */}
      <Text style={[styles.label, { color: colors.subtitle }]}>{t("settingsThemeStyle")}</Text>
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={[styles.selectorBtn, { borderColor: colors.border }, isDark && styles.selectorBtnActive]}
          onPress={() => onToggleTheme("dark")}
          accessibilityRole="button"
          accessibilityState={{ selected: isDark }}
        >
          <Text style={[styles.selectorBtnText, { color: isDark ? "#FFFFFF" : colors.inactiveText }]}>
            {t("settingsDarkMode")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorBtn, { borderColor: colors.border }, !isDark && styles.selectorBtnActive]}
          onPress={() => onToggleTheme("light")}
          accessibilityRole="button"
          accessibilityState={{ selected: !isDark }}
        >
          <Text style={[styles.selectorBtnText, { color: !isDark ? "#FFFFFF" : colors.inactiveText }]}>
            {t("settingsLightMode")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Currency Selector */}
      <Text style={[styles.label, { color: colors.subtitle, marginTop: 16 }]}>
        {t("settingsSharedCurrency")}
      </Text>
      <View style={styles.currencyGrid}>
        {currencies.map((curr) => {
          const isActive = activeCurrency === curr;
          return (
            <TouchableOpacity
              key={curr}
              style={[styles.currBtn, { borderColor: colors.border }, isActive && styles.currBtnActive]}
              onPress={() => onSelectCurrency(curr)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.currBtnText, { color: isActive ? "#FFFFFF" : colors.text }]}>
                {curr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Location / Timezone Selector */}
      <Text style={[styles.label, { color: colors.subtitle, marginTop: 16 }]}>
        {t("settingsReminderTimezone")}
      </Text>
      <View style={styles.locationList}>
        {locations.map((loc) => {
          const isActive = (timezone ?? "device") === loc.value;
          return (
            <TouchableOpacity
              key={loc.value}
              style={[
                styles.locBtn,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  borderColor: colors.border,
                },
                isActive && styles.locBtnActive,
              ]}
              onPress={() => onSelectLocation(loc.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.locBtnText, { color: isActive ? "#FFFFFF" : colors.text }]}>
                {loc.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectorRow: { flexDirection: "row", gap: 12 },
  selectorBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  selectorBtnActive: { backgroundColor: SETTINGS_LIVE_COLORS.accent, borderColor: SETTINGS_LIVE_COLORS.accent },
  selectorBtnText: { fontSize: 13, fontWeight: "700" },
  currencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  currBtn: {
    width: 52,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  currBtnActive: { backgroundColor: SETTINGS_LIVE_COLORS.accent, borderColor: SETTINGS_LIVE_COLORS.accent },
  currBtnText: { fontSize: 15, fontWeight: "700" },
  locationList: { gap: 8 },
  locBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  locBtnActive: { backgroundColor: SETTINGS_LIVE_COLORS.accent, borderColor: SETTINGS_LIVE_COLORS.accent },
  locBtnText: { fontSize: 13, fontWeight: "600" },
});

export default PreferencesCard;