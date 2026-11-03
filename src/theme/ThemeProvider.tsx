import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, AccessibilityInfo, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTokens, lightTokens } from "./tokens";
import type { Scheme, ThemeTokens } from "./tokens";

/** How aggressively we use (or avoid) translucency for L2 surfaces. */
export type MaterialPolicy = "glass" | "blur" | "opaque";

export interface ThemeValue {
  tokens: ThemeTokens;
  scheme: Scheme;
  /** Effective preference: "system", "light" or "dark". */
  preference: Scheme | "system";
  reduceMotion: boolean;
  reduceTransparency: boolean;
  materialPolicy: MaterialPolicy;
  setPreference: (p: Scheme | "system") => void;
}

const STORAGE_KEY = "twofold:themePreference";

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<Scheme | "system">("system");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  // Load persisted preference once; avoid a visible first-paint flash by
  // defaulting to "system" until the stored value is applied.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") {
          setPreferenceState(v);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const motionSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );

    let transparentSub: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
    if (Platform.OS === "ios") {
      AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
      transparentSub = AccessibilityInfo.addEventListener(
        "reduceTransparencyChanged",
        setReduceTransparency
      );
    }

    return () => {
      motionSub.remove();
      transparentSub?.remove();
    };
  }, []);

  const setPreference = useCallback((p: Scheme | "system") => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // Resolve the effective color scheme.
    const systemScheme = Appearance.getColorScheme();
    const scheme: Scheme =
      preference === "system"
        ? systemScheme === "light"
          ? "light"
          : "dark"
        : preference;

    const tokens: ThemeTokens = scheme === "light" ? lightTokens : darkTokens;

    // Derive the material policy from platform capabilities + accessibility.
    let materialPolicy: MaterialPolicy = "blur";
    if (Platform.OS === "ios" && !reduceTransparency) {
      materialPolicy = "glass"; // native glass when SDK 56 exposes it; else BlurView
    } else if (reduceTransparency || Platform.OS !== "ios") {
      materialPolicy = "blur";
    }
    // Very old / headless platforms and explicit reduceTransparency fall back opaque.
    if (reduceTransparency) {
      materialPolicy = "opaque";
    }

    return {
      tokens,
      scheme,
      preference,
      reduceMotion,
      reduceTransparency,
      materialPolicy,
      setPreference,
    };
  }, [preference, reduceMotion, reduceTransparency, setPreference]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export { ThemeContext };