import React, { useEffect, useState } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder for loading data — respects reduce-motion. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const { tokens, reduceMotion } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  const color = tokens.colors.surfacePressed;

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: color, opacity },
        style,
      ]}
    />
  );
}

export default Skeleton;
