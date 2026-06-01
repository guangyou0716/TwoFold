import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  ScrollView
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import { writeBatch, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";

type PairingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Pairing">;
};

export default function PairingScreen({ navigation }: PairingScreenProps) {
  const currentUser = auth.currentUser;
  const [partnerCode, setPartnerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // The RootNavigator handles auto-redirect when groupId/partnerId are set.
  // We do NOT subscribe to onSnapshot here — the RootNavigator handles it globally.
  // This avoids the double-redirect race condition.

  const copyToClipboard = async () => {
    if (!currentUser) return;
    await Clipboard.setStringAsync(currentUser.uid);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const shareCode = async () => {
    if (!currentUser) return;
    try {
      await Share.share({
        message: `Join me on TwoFold! Use my invite code to connect:\n\n${currentUser.uid}\n\nDownload TwoFold and paste this code to link our accounts.`,
        title: "Join me on TwoFold",
      });
    } catch {
      // Share cancelled or failed — no action needed
    }
  };

  const handleConnect = async () => {
    if (!currentUser) return;
    const cleanedCode = partnerCode.trim();

    if (!cleanedCode) {
      Alert.alert("Missing Code", "Please enter your partner's invite code.");
      return;
    }

    if (cleanedCode === currentUser.uid) {
      Alert.alert("Oops!", "You cannot pair with yourself! Please enter your partner's code.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify partner exists
      const partnerDocRef = doc(db, "users", cleanedCode);
      const partnerSnap = await getDoc(partnerDocRef);

      if (!partnerSnap.exists()) {
        Alert.alert(
          "Invalid Code",
          "No user found with this invite code. Double-check the code and try again."
        );
        setLoading(false);
        return;
      }

      const partnerData = partnerSnap.data();

      if (partnerData.groupId || partnerData.partnerId) {
        Alert.alert(
          "Partner Already Paired",
          "This user is already linked with someone else. Ask them to un-pair first."
        );
        setLoading(false);
        return;
      }

      // 2. Generate deterministic group ID
      const sharedGroupId = `group_${currentUser.uid}_${cleanedCode}`;

      // 3. Atomic batch write — all three documents or none
      const batch = writeBatch(db);

      // Create the shared Group document
      batch.set(doc(db, "groups", sharedGroupId), {
        groupId: sharedGroupId,
        partnerAId: currentUser.uid,
        partnerBId: cleanedCode,
        balances: {
          [currentUser.uid]: 0,
          [cleanedCode]: 0,
        },
        streaks: {
          choreStreak: 0,
          lastChoreDate: null,
        },
        createdAt: new Date().toISOString(),
      });

      // Update both user documents
      batch.update(doc(db, "users", currentUser.uid), {
        partnerId: cleanedCode,
        groupId: sharedGroupId,
      });

      batch.update(doc(db, "users", cleanedCode), {
        partnerId: currentUser.uid,
        groupId: sharedGroupId,
      });

      // Execute atomically
      await batch.commit();

      // RootNavigator will detect the pairing and redirect automatically
      Alert.alert(
        "Connected! 💕",
        "You and your partner are now TwoFold. Let's get started!"
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      Alert.alert("Pairing Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("[PairingScreen] Logout failed:", error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Connect with Partner</Text>
          <Text style={styles.subtitle}>
            Share your invite code with your partner or enter theirs to link your accounts together.
          </Text>

          {/* User's Own Invite Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Your Personal Invite Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} numberOfLines={1} ellipsizeMode="middle">
                {currentUser?.uid ?? "Loading..."}
              </Text>
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity
                style={styles.codeActionBtn}
                onPress={copyToClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.codeActionText}>
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.codeActionBtn, styles.codeActionPrimary]}
                onPress={shareCode}
                activeOpacity={0.7}
              >
                <Text style={[styles.codeActionText, styles.codeActionTextPrimary]}>
                  🔗 Share Code
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Enter Partner's Invite Code */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Enter Partner's Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste partner's invite code here"
              placeholderTextColor="#606580"
              value={partnerCode}
              onChangeText={setPartnerCode}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleConnect}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.connectButton, loading && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.connectButtonText}>Connect & Start Playing</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#A0A5C0",
    marginBottom: 32,
    lineHeight: 22,
  },
  codeContainer: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeBox: {
    backgroundColor: "rgba(255, 94, 126, 0.05)",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 94, 126, 0.12)",
    marginBottom: 12,
  },
  codeText: {
    color: "#FF5E7E",
    fontSize: 14,
    fontWeight: "700",
  },
  codeActions: {
    flexDirection: "row",
    gap: 10,
  },
  codeActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  codeActionPrimary: {
    backgroundColor: "rgba(255, 94, 126, 0.1)",
    borderColor: "rgba(255, 94, 126, 0.2)",
  },
  codeActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A5C0",
  },
  codeActionTextPrimary: {
    color: "#FF5E7E",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dividerText: {
    color: "#606580",
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    height: 56,
    backgroundColor: "#131520",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  connectButton: {
    height: 56,
    backgroundColor: "#FF5E7E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5E7E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutButton: {
    alignItems: "center",
    marginTop: 20,
    padding: 12,
  },
  logoutButtonText: {
    color: "#606580",
    fontSize: 14,
    fontWeight: "600",
  },
});
