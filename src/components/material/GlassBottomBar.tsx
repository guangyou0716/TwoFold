import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "../primitives/AppIcon";
import { AppText } from "../primitives/AppText";
import { IconName } from "../../theme/icon-map";
import { LiquidGlassSurface } from "./LiquidGlassSurface";
import { useTheme } from "../../theme/useTheme";

export interface GlassBarTab {
  key: string;
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  /** Emitted when the tab is pressed. */
  onPress?: () => void;
}

export interface GlassBottomBarProps {
  tabs: GlassBarTab[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * L2 glass bottom dock. Selection is conveyed by a tinted pill AND the label,
 * never color alone, with a 44px target and safe-area-aware height.
 */
export function GlassBottomBar({ tabs, activeKey, onSelect }: GlassBottomBarProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const insets = useSafeAreaInsets();

  return (
    <LiquidGlassSurface
      style={[styles.dock, { paddingBottom: insets.bottom + 6 }]}
    >
      <View style={[styles.row, { minHeight: tokens.touchTarget }]}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.onPress) {
                  tab.onPress();
                } else {
                  onSelect(tab.key);
                }
              }}
              accessibilityRole="tab"
              accessibilityLabel={tab.accessibilityLabel}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tab,
                { minHeight: Math.max(tokens.touchTarget - 2, 42) },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconWrap, active && { backgroundColor: "rgba(127,127,127,0.16)" }]}>
                <AppIcon
                  name={tab.icon}
                  size={22}
                  color={active ? c.accent : c.textSecondary}
                  label={tab.accessibilityLabel}
                />
              </View>
              <AppText
                variant="caption"
                color={active ? c.accent : c.textSecondary}
                style={active ? styles.activeLabel : undefined}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.15)",
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activeLabel: { fontWeight: "700" },
  pressed: { opacity: 0.7 },
});

export default GlassBottomBar;
