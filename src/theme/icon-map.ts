import type { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";

/**
 * Semantic icon names → concrete glyph names.
 *
 * The plan forbids using colored dots or emoji as the sole identity of a
 * function, and requires a consistent icon across platforms. `@expo/vector-icons`
 * Ionicons serves as the cross-platform Material-style fallback.
 *
 * Extend this map (plus the `IconName` type) instead of scattering glyph names
 * through screens.
 */

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const iconMap = {
  home: "home-outline" as const,
  homeActive: "home" as const,
  reminders: "notifications-outline" as const,
  remindersActive: "notifications" as const,
  budget: "wallet-outline" as const,
  budgetActive: "wallet" as const,
  memories: "images-outline" as const,
  memoriesActive: "images" as const,
  settings: "settings-outline" as const,
  settingsActive: "settings" as const,
  partner: "people-outline" as const,
  partnerActive: "people" as const,
  add: "add" as const,
  scan: "scan-outline" as const,
  scanActive: "scan" as const,
  edit: "pencil-outline" as const,
  delete: "trash-outline" as const,
  calendar: "calendar-outline" as const,
  chevronRight: "chevron-forward" as const,
  chevronDown: "chevron-down" as const,
  close: "close" as const,
  check: "checkmark" as const,
  checkCircle: "checkmark-circle" as const,
  undo: "arrow-undo-outline" as const,
  back: "arrow-back" as const,
  logout: "log-out-outline" as const,
  lock: "lock-closed-outline" as const,
  export: "download-outline" as const,
  share: "share-social-outline" as const,
  copy: "copy-outline" as const,
  camera: "camera-outline" as const,
  qrCode: "qr-code-outline" as const,
  warning: "alert-circle-outline" as const,
  error: "alert-circle" as const,
  retry: "refresh" as const,
  sun: "sunny-outline" as const,
  moon: "moon-outline" as const,
  heart: "heart-outline" as const,
  play: "play" as const,
} as const;

export type IconName = keyof typeof iconMap;

/** Resolve a semantic name to a concrete Ionicons glyph. */
export function toIcon(
  name: IconName,
  active = false
): IoniconName {
  return iconMap[name];
}