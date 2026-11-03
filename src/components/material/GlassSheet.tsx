import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LiquidGlassSurface } from "./LiquidGlassSurface";
import { useTheme } from "../../theme/useTheme";

export interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

/**
 * L2 bottom sheet built on LiquidGlassSurface. Content/actions must be rendered
 * as children (never nested inside another blur). Handles safe-area bottom.
 */
export function GlassSheet({ visible, onClose, children }: GlassSheetProps) {
  const { tokens } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: tokens.colors.scrim }]} onPress={onClose} accessibilityLabel="Close sheet" />
        <LiquidGlassSurface
          style={[
            styles.sheet,
            {
              borderTopLeftRadius: tokens.radius.xl,
              borderTopRightRadius: tokens.radius.xl,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.grabber} />
          </View>
          {children}
        </LiquidGlassSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  sheet: {
    paddingBottom: 28,
    paddingTop: 8,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  header: { alignItems: "center", marginBottom: 4 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.4)", marginBottom: 10 },
});

export default GlassSheet;