import React from "react";
import {
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { GlassBottomBar, GlassBarTab } from "../components/material/GlassBottomBar";
import { IconName } from "../theme/icon-map";

// Route name → semantic icon mapping. Keeps the dock free of glyph literals.
const TAB_ICONS: Record<string, IconName> = {
  Dashboard: "home",
  Budget: "budget",
  MemoryCapsule: "memories",
  Settings: "settings",
};

/**
 * Bridges React Navigation's bottom-tab state to the L2 <GlassBottomBar> dock.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const tabs: GlassBarTab[] = state.routes.map((route, index) => {
    const options = descriptors[route.key]?.options;
    const label = options?.tabBarLabel ?? options?.title ?? route.name;
    const icon = TAB_ICONS[route.name] ?? "home";

    return {
      key: route.key,
      icon,
      label: typeof label === "string" ? label : route.name,
      accessibilityLabel: typeof label === "string" ? label : route.name,
      onPress: () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      },
    };
  });

  const activeKey = state.routes[state.index]?.key;

  return (
    <GlassBottomBar
      tabs={tabs}
      activeKey={activeKey ?? ""}
      onSelect={(key) => {
        const route = state.routes.find((r) => r.key === key);
        if (route) navigation.navigate(route.name, route.params);
      }}
    />
  );
}

export default GlassTabBar;