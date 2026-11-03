import { useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Notification permission handling (Phase 8).
 *
 * - Permission is requested the first time a feature actually needs it
 *   (scheduling a reminder), not on app/screen mount.
 * - A short pre-permission explanation is shown before the OS prompt.
 * - After an explicit denial we never re-prompt; we point at system Settings.
 */
export function useNotificationPermissions() {
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") return true;

      if (status === "denied") {
        Alert.alert(
          "Notifications are off",
          "Turn on notifications in Settings to receive your reminder alerts.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openSettings().catch(() => {});
              },
            },
          ]
        );
        return false;
      }

      // `undetermined` — explain before the OS prompt.
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Enable reminder alerts?",
          "TwoFold needs notification permission so it can alert you when a reminder is due.",
          [
            { text: "Not now", style: "cancel", onPress: () => resolve(false) },
            { text: "Continue", onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return false;

      const asked = await Notifications.requestPermissionsAsync();
      return asked.status === "granted";
    } catch {
      return false;
    }
  }, []);

  return { ensurePermission };
}

export default useNotificationPermissions;