import type { translations } from "../../../utils/translations";

/** Shared palette shape for the memories feature components. */
export interface MemoryColors {
  background: string;
  card: string;
  text: string;
  subtitle: string;
  border: string;
  inactiveText: string;
}

export type MemoryLang = "en" | "zh";
export type Translator = (key: keyof typeof translations.en) => string;

/**
 * Shared semantic accents for memories components (mirrors the shipped palette;
 * the plan intends these to come from `src/theme/tokens.ts` after the app-wide
 * re-paint, which needs device review).
 */
export const MEMORY_LIVE_COLORS = {
  accent: "#FF5E7E",
} as const;