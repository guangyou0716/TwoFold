import { useContext } from "react";
import { ThemeContext, ThemeValue } from "./ThemeProvider";

export { MaterialPolicy } from "./ThemeProvider";

/** Access merged design tokens + accessibility-aware material policy. */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/** Convenience: colors only. */
export function useThemeColors() {
  return useTheme().tokens.colors;
}