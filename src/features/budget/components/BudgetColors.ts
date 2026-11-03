import type { translations } from "../../../utils/translations";

/** Shared palette shape for the budget feature components. */
export interface BudgetColors {
  background: string;
  card: string;
  text: string;
  subtitle: string;
  border: string;
  tabBackground: string;
  inactiveText: string;
  inputBg: string;
  inputBorder: string;
  placeholderText: string;
}

export type BudgetLang = "en" | "zh";
export type BudgetFilter = "all" | "daily" | "monthly" | "yearly";

/** Matches the app's translator signature. */
export type Translator = (key: keyof typeof translations.en) => string;

/**
 * Shared semantic accents for budget components. These mirror the currently
 * shipped palette; the plan's intent is to eventually source them from
 * `src/theme/tokens.ts` once the whole app is re-painted (needs device review).
 */
export const BUDGET_LIVE_COLORS = {
  accent: "#FF5E7E",
  positive: "#34C759",
  negative: "#FF3B30",
} as const;