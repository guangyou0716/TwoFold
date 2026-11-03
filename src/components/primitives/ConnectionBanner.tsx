import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { useConnectivity } from "../../hooks/useConnectivity";

/**
 * Thin banner shown while offline. Rendered above the navigator; never blocks
 * interaction with the rest of the app.
 */
export function ConnectionBanner() {
  const { isOnline } = useConnectivity();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          top: insets.top,
          backgroundColor: tokens.colors.warning,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>Offline — changes may not sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 100,
    paddingVertical: 6,
    alignItems: "center",
  },
  text: { color: "#1A1400", fontSize: 13, fontWeight: "600" },
});

export default ConnectionBanner;