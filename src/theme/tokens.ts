/**
 * Design tokens for TwoFold.
 *
 * Covers the L0/L1/L2 surface model from the Liquid Glass plan:
 *   - L0 content surfaces (ScrollView/List/body) get no blur.
 *   - L1 material cards (reminders, transactions, memories, forms).
 *   - L2 native glass controls (dock, segmented control, sheets, FAB, compact headers).
 *
 * Semantics are gender-neutral; partner A/B tints are the only personal accents.
 */

export type Scheme = "light" | "dark";

export interface SemanticColors {
  /** App canvas — L0 background. */
  canvas: string;
  /** Elevated canvas for dialogs/no-content zones. */
  canvasElevated: string;
  /** L1 material surface. */
  surface: string;
  /** Highlighted / pressed surface variant. */
  surfacePressed: string;
  /** Primary body text. */
  text: string;
  /** Secondary / muted text. */
  textSecondary: string;
  /** Placeholder / disabled text. */
  textTertiary: string;
  /** Hairline borders and strokes. */
  border: string;
  /** Primary accent (rose/coral). */
  accent: string;
  /** Accent on tinted surfaces (contrast-safe). */
  accentContent: string;
  /** Partner A tint (restrained secondary accent). */
  partnerA: string;
  /** Partner B tint (restrained secondary accent). */
  partnerB: string;
  /** Danger / destructive. */
  danger: string;
  /** Success. */
  success: string;
  /** Warning. */
  warning: string;
  /** Overlay scrim behind sheets/modals. */
  scrim: string;
}

export interface DesignTokens {
  colors: SemanticColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  type: {
    caption: number;
    body: number;
    bodyEmphasis: number;
    title: number;
    headline: number;
    display: number;
  };
  touchTarget: number;
  /** L1 material constants. */
  material: {
    fillOpacity: number;
    borderWidth: number;
    shadow: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  /** L2 glass constants (blur fallback strength on non-native-glass platforms). */
  glass: {
    blurIntensity: number;
    /** Valid `expo-blur` `tint` values only (used by the BlurView fallback). */
    tint: "light" | "default" | "dark" | "extraLight" | "regular" | "prominent";
    highlight: string;
    overlayOpacity: number;
  };
  motion: {
    fast: number;
    base: number;
    slow: number;
    springStiffness: number;
    springDamping: number;
  };
}

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const radius = { sm: 8, md: 14, lg: 20, xl: 28, full: 9999 };
const type = { caption: 12, body: 15, bodyEmphasis: 17, title: 22, headline: 28, display: 40 };
const touchTarget = 44;

const lightColors: SemanticColors = {
  canvas: "#F6F2EC", // warm pearl
  canvasElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfacePressed: "#F1ECE4",
  text: "#231F1A",
  textSecondary: "#6B6459",
  textTertiary: "#A79F92",
  border: "rgba(35, 31, 26, 0.08)",
  accent: "#C4535B", // muted coral/rose — sober, mature
  accentContent: "#FFFFFF",
  partnerA: "#B25E66",
  partnerB: "#3E6E8E",
  danger: "#B4402F",
  success: "#2F7D5B",
  warning: "#A76B2A",
  scrim: "rgba(24, 20, 15, 0.42)",
};

const darkColors: SemanticColors = {
  canvas: "#0E0D12", // deep midnight
  canvasElevated: "#16151C",
  surface: "#1B1A23",
  surfacePressed: "#23222D",
  text: "#F2EEE8",
  textSecondary: "#ABA59B",
  textTertiary: "#6F6A63",
  border: "rgba(242, 238, 232, 0.08)",
  accent: "#E0727C",
  accentContent: "#1A1112",
  partnerA: "#D9828C",
  partnerB: "#7FB0D2",
  danger: "#E07A66",
  success: "#6FBF99",
  warning: "#D8A25E",
  scrim: "rgba(0, 0, 0, 0.5)",
};

const material = {
  fillOpacity: 0.96,
  borderWidth: StyleSheetHairlineWidth(),
  shadow: "#000000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const motion = {
  fast: 140,
  base: 260,
  slow: 420,
  springStiffness: 280,
  springDamping: 26,
};

/** iOS hairline is 1px; Android falls back to 1pt for legibility. */
function StyleSheetHairlineWidth(): number {
  // Kept as a plain number so this token file stays environment-agnostic.
  // Platform.PixelRatio is injected by consumers that need it.
  return 1;
}

export const darkTokens: DesignTokens = {
  colors: darkColors,
  spacing,
  radius,
  type,
  touchTarget,
  material: { ...material, fillOpacity: 0.97 },
  glass: {
    blurIntensity: 60,
    tint: "dark",
    highlight: "rgba(255, 255, 255, 0.10)",
    overlayOpacity: 0.9,
  },
  motion,
};

export const lightTokens: DesignTokens = {
  colors: lightColors,
  spacing,
  radius,
  type,
  touchTarget,
  material: { ...material, fillOpacity: 0.95 },
  glass: {
    blurIntensity: 40,
    tint: "extraLight",
    highlight: "rgba(255, 255, 255, 0.55)",
    overlayOpacity: 0.82,
  },
  motion,
};

export type ThemeTokens = DesignTokens;