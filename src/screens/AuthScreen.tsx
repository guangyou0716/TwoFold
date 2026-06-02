import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal
} from "react-native";
import { policyText } from "../utils/policyText";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { translations } from "../utils/translations";

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Auth">;
  route: RouteProp<RootStackParamList, "Auth">;
};

// Map Firebase error codes to friendly messages (localized on the fly based on selected language)
const getFirebaseErrorMessage = (code: string, lang: "en" | "zh"): string => {
  if (lang === "zh") {
    switch (code) {
      case "auth/email-already-in-use":
        return "该电子邮箱已被注册，请尝试直接登录。";
      case "auth/invalid-email":
        return "请输入有效的邮箱地址。";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "密码或邮箱错误，请重新输入。";
      case "auth/user-not-found":
        return "未找到该邮箱对应的账号，请尝试注册。";
      case "auth/weak-password":
        return "你的密码太弱，请至少使用 6 个字符。";
      case "auth/too-many-requests":
        return "尝试次数过多，请在几分钟后重试。";
      case "auth/network-request-failed":
        return "网络错误，请检查你的网络连接。";
      default:
        return "发生未知错误，请重试。";
    }
  } else {
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
  }
};

// Basic email format validator
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function AuthScreen({ navigation, route }: AuthScreenProps) {
  const { isSignUp: initialIsSignUp, initialLang } = route.params;
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [lang] = useState<"en" | "zh">(initialLang ?? "en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [policyVisible, setPolicyVisible] = useState(false);

  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  const handleAuth = async () => {
    // --- Client-side validation ---
    if (isSignUp && !displayName.trim()) {
      Alert.alert(t("authMissingName"), t("authPleaseName"));
      return;
    }
    if (isSignUp && displayName.trim().length > 30) {
      Alert.alert(t("authInvalidName"), t("authNameTooLong"));
      return;
    }
    if (isSignUp && !agreeToTerms) {
      Alert.alert(
        lang === "zh" ? "需要同意政策" : "Consent Required",
        lang === "zh"
          ? "在注册前，您必须先阅读并勾选同意服务条款与隐私政策。"
          : "You must agree to the Terms of Service and Privacy Policy before signing up."
      );
      return;
    }
    if (!email.trim()) {
      Alert.alert(t("authMissingEmail"), t("authPleaseEmail"));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(t("authInvalidEmail"), t("authPleaseValidEmail"));
      return;
    }
    if (!password) {
      Alert.alert(t("authMissingPassword"), t("authPleasePassword"));
      return;
    }
    if (isSignUp) {
      const strictPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-+=\(\)])[A-Za-z\d@$!%*?&._\-+=\(\)]{8,}$/;
      if (!strictPasswordRegex.test(password)) {
        Alert.alert(t("authWeakPassword"), t("authPasswordLength"));
        return;
      }
    } else {
      if (password.length < 6) {
        Alert.alert(t("authWeakPassword"), t("authPasswordLength"));
        return;
      }
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
            isNewUser: true,
            languagePreference: lang,
          });

          // Send verification email
          await sendEmailVerification(user);

          // Force sign out until email is verified
          await signOut(auth);

          Alert.alert(
            lang === "zh" ? "验证邮件已发送 📧" : "Verification Email Sent 📧",
            lang === "zh"
              ? "已成功创建账号！我们已向您的邮箱发送了验证邮件，请在查收并点击链接验证后，再进行登录。"
              : "Account created successfully! A verification email has been sent. Please verify your email before logging in."
          );
          setIsSignUp(false);
          setPassword("");
        } catch (profileError) {
          // Rollback: delete the Auth account if Firestore profile creation fails
          await user.delete();
          throw profileError;
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          await signOut(auth);
          Alert.alert(
            lang === "zh" ? "需要邮箱验证 📧" : "Verification Required 📧",
            lang === "zh"
              ? "请先查收您的邮箱，并点击验证链接以激活账号后再进行登录。"
              : "Please check your inbox and click the verification link to activate your account before logging in."
          );
          return;
        }
      }
      // Navigation is handled automatically by onAuthStateChanged in RootNavigator
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "";
      Alert.alert(t("authFailed"), getFirebaseErrorMessage(code, lang));
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
            <Text style={styles.backButtonText}>{t("back")}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{isSignUp ? t("authCreateAccount") : t("authWelcomeBack")}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? t("authSignUpSub")
              : t("authLogInSub")}
          </Text>

          {isSignUp && (
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{t("authYourName")}</Text>
              <TextInput
                style={styles.input}
                placeholder="Alex"
                placeholderTextColor="#606580"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                maxLength={30}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t("authEmail")}</Text>
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
            <Text style={styles.label}>{t("authPassword")}</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder={isSignUp 
                  ? (lang === "zh" ? "至少8位 (含大小写+数字+特殊符号)" : "Min. 8 chars (A-Z, a-z, 0-9, symbol)")
                  : (lang === "zh" ? "请输入密码" : "Password")
                }
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
                {isSignUp ? t("authCreateAccount") : t("logInBtn")}
              </Text>
            )}
          </TouchableOpacity>

          {isSignUp && (
            <TouchableOpacity 
              style={styles.checkboxRow} 
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                {lang === "zh" ? (
                  <Text>
                    我已阅读并同意
                    <Text style={styles.linkText} onPress={() => setPolicyVisible(true)}> 服务条款 </Text>
                    和
                    <Text style={styles.linkText} onPress={() => setPolicyVisible(true)}> 隐私政策 </Text>
                    ，允许数据同步。
                  </Text>
                ) : (
                  <Text>
                    I have read and agree to the
                    <Text style={styles.linkText} onPress={() => setPolicyVisible(true)}> Terms of Service </Text>
                    and
                    <Text style={styles.linkText} onPress={() => setPolicyVisible(true)}> Privacy Policy </Text>
                    for data sync.
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchMode}>
            <Text style={styles.switchButtonText}>
              {isSignUp
                ? t("authSwitchLogIn")
                : t("authSwitchSignUp")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Scrollable Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={policyVisible}
        onRequestClose={() => setPolicyVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalContainer}>
            <Text style={styles.policyModalTitle}>
              {lang === "zh" ? "服务条款 & 隐私政策" : "Terms & Privacy Policy"}
            </Text>
            <ScrollView style={styles.policyScrollView} showsVerticalScrollIndicator={true}>
              <Text style={styles.policyBodyText}>
                {policyText[lang]}
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.policyCloseBtn} 
              onPress={() => setPolicyVisible(false)}
            >
              <Text style={styles.policyCloseBtnText}>
                {lang === "zh" ? "确认已阅" : "Close & I Read"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  consentText: {
    fontSize: 11,
    color: "#606580",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#606580",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#FF5E7E",
    borderColor: "#FF5E7E",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: "#A0A5C0",
    lineHeight: 18,
  },
  linkText: {
    color: "#FF5E7E",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 16, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  policyModalContainer: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#131520",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  policyModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  policyScrollView: {
    flexGrow: 0,
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
  },
  policyBodyText: {
    fontSize: 13,
    color: "#A0A5C0",
    lineHeight: 20,
  },
  policyCloseBtn: {
    height: 50,
    backgroundColor: "#FF5E7E",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  policyCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
