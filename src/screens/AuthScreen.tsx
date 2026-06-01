import React, { useState } from "react";
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
  ScrollView
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Auth">;
  route: RouteProp<RootStackParamList, "Auth">;
};

// Map Firebase error codes to friendly messages
const getFirebaseErrorMessage = (code: string): string => {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email address is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/user-not-found":
      return "No account found with this email. Try signing up!";
    case "auth/weak-password":
      return "Your password must be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

// Basic email format validator
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function AuthScreen({ navigation, route }: AuthScreenProps) {
  const { isSignUp: initialIsSignUp } = route.params;
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    // --- Client-side validation ---
    if (isSignUp && !displayName.trim()) {
      Alert.alert("Missing Name", "Please enter your name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address (e.g. you@example.com).");
      return;
    }
    if (!password) {
      Alert.alert("Missing Password", "Please enter a password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Your password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Initialize user profile — if this fails, also delete the auth account (rollback)
        try {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: displayName.trim(),
            createdAt: new Date().toISOString(),
            moodBattery: {
              level: 100,
              status: "Feeling Great! 🌟",
              updatedAt: new Date().toISOString(),
            },
          });
        } catch (profileError) {
          // Rollback: delete the Auth account if Firestore profile creation fails
          await user.delete();
          throw profileError;
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Navigation is handled automatically by onAuthStateChanged in RootNavigator
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "";
      Alert.alert("Authentication Failed", getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    // Clear form and toggle mode
    setEmail("");
    setPassword("");
    setDisplayName("");
    setShowPassword(false);
    setIsSignUp(!isSignUp);
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
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Start your journey in sync with your partner"
              : "Sign in to connect with your partner"}
          </Text>

          {isSignUp && (
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Alex"
                placeholderTextColor="#606580"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#606580"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 6 characters"
                placeholderTextColor="#606580"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                returnKeyType="done"
                onSubmitEditing={handleAuth}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? "Create Account" : "Log In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchMode}>
            <Text style={styles.switchButtonText}>
              {isSignUp
                ? "Already have an account? Log In"
                : "Don't have an account? Sign Up"}
            </Text>
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
    paddingVertical: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  backButtonText: {
    color: "#A0A5C0",
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
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
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A0A5C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 56,
    backgroundColor: "#131520",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    backgroundColor: "#131520",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    paddingLeft: 12,
    justifyContent: "center",
  },
  eyeIcon: {
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#FF5E7E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#FF5E7E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  switchButton: {
    alignItems: "center",
    marginTop: 24,
    padding: 10,
  },
  switchButtonText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
  },
});
