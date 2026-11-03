import type { translations } from "../../../utils/translations";

/** Shared color palette shape consumed by the dashboard feature components. */

export interface DashboardColors {
  background: string;
  card: string;
  text: string;
  subtitle: string;
  border: string;
  activeTab: string;
  tabBackground: string;
  inactiveText: string;
  inputBg: string;
  inputBorder: string;
  placeholderText: string;
}

export type DashboardLang = "en" | "zh";

/** Matches the app's translator function signature (translation keys are literal). */
export type Translator = (key: keyof typeof translations.en) => string;

export const DASH_LIVE_COLORS = {
  positive: "#34C759",
  negative: "#FF3B30",
  accent: "#FF5E7E",
} as const;