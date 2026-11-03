import React, { useMemo } from "react";
import {
  View,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useTheme } from "../../theme/useTheme";
import { resolveMaterialMode } from "./materialMode";

/**
 * The single L2 glass adapter. Screens must NOT import platform glass packages
 * directly; they render <LiquidGlassSurface> instead.
 *
 * Strategy (per plan 4.3):
 *   1. iOS 26+ with expo-glass-effect available → native Liquid Glass.
 *   2. Older iOS or Android SDK 31+ → expo-blur BlurView fallback.
 *   3. reduce-transparency / low-end / unknown platform → opaque L1 View.
 *
 * The feature check stays inside the render path so unsupported platforms do
 * not call the native availability API during module initialization.
 */
export interface LiquidGlassSurfaceProps {
  style?: StyleProp<ViewStyle>;
  /** content layer rendered on top of the glass (L2 content must live here). */
  children?: React.ReactNode;
  /** intensity passed to the blur fallback (defaults to theme token). */
  blurIntensity?: number;
}

export function LiquidGlassSurface({
  style,
  children,
  blurIntensity,
}: LiquidGlassSurfaceProps) {
  const { tokens, reduceTransparency } = useTheme();
  const intensity = blurIntensity ?? tokens.glass.blurIntensity;

  // Native glass only on iOS when the SDK 56 glass API reports availability.
  const nativeAvailable = useMemo(() => {
    if (Platform.OS !== "ios") return false;
    try {
      return isGlassEffectAPIAvailable();
    } catch {
      return false;
    }
  }, []);

  const mode = resolveMaterialMode({
    platform: Platform.OS,
    nativeGlassAvailable: nativeAvailable,
    reduceTransparency,
  });

  if (mode === "native") {
    return (
      <GlassView
        style={[styles.base, style]}
        glassEffectStyle="regular"
        tintColor={tokens.colors.accent}
        isInteractive
      >
        {children}
      </GlassView>
    );
  }

  // Blur fallback (iOS/Android). Reduce-transparency or unsupported → opaque.
  if (mode === "blur") {
    return (
      <BlurView
        intensity={intensity}
        tint={tokens.glass.tint}
        style={[styles.base, style]}
      >
        {children}
      </BlurView>
    );
  }

  // Opaque L1 fallback respecting reduce-transparency.
  return (
    <View
      style={[
        styles.base,
        styles.opaque,
        { backgroundColor: tokens.colors.surface },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  opaque: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.2)",
  },
});

export default LiquidGlassSurface;
