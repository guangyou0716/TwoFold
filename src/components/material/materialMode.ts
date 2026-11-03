/**
 * Pure decision function for L2 surface material selection.
 *
 * Extracted from `LiquidGlassSurface` so the platform/accessibility fallback
 * matrix is unit-testable without a device.
 *
 *   1. iOS 26+ with `expo-glass-effect` and transparency allowed → native glass.
 *   2. reduce-transparency → opaque L1 surface.
 *   3. otherwise → BlurView fallback.
 */
export type MaterialMode = "native" | "blur" | "opaque";

export interface MaterialModeInput {
  /** Platform.OS */
  platform: string;
  /** True when expo-glass-effect resolved AND the platform supports it. */
  nativeGlassAvailable: boolean;
  /** AccessibilityInfo "reduce transparency" flag. */
  reduceTransparency: boolean;
}

export function resolveMaterialMode({
  platform,
  nativeGlassAvailable,
  reduceTransparency,
}: MaterialModeInput): MaterialMode {
  if (nativeGlassAvailable && platform === "ios" && !reduceTransparency) {
    return "native";
  }
  if (reduceTransparency) return "opaque";
  return "blur";
}