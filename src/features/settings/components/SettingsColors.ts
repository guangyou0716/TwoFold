import type { translations } from "../../../utils/translations";

/** Shared palette shape for the settings feature components. */
export interface SettingsColors {
  background: string;
  card: string;
  text: string;
  subtitle: string;
  border: string;
  inactiveText: string;
}

export type SettingsLang = "en" | "zh";
export type Translator = (key: keyof typeof translations.en) => string;

export interface LocationOption {
  value: string;
  label: string;
}

/**
 * Shared semantic accents for settings components (mirrors the shipped palette;
 * the plan intends these to come from `src/theme/tokens.ts` after the app-wide
 * re-paint, which needs device review).
 */
export const SETTINGS_LIVE_COLORS = {
  accent: "#FF5E7E",
  danger: "#FF3B30",
} as const;