import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, LogBox } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { RootStackParamList, HomeTabParamList } from "../types";
import { StatusBar } from "expo-status-bar";

LogBox.ignoreLogs(["expo-notifications"]);

// Import Screens
import WelcomeScreen from "../screens/WelcomeScreen";
import AuthScreen from "../screens/AuthScreen";
import PairingScreen from "../screens/PairingScreen";
import DashboardScreen from "../screens/DashboardScreen";
import BudgetScreen from "../screens/BudgetScreen";
import MemoryCapsuleScreen from "../screens/MemoryCapsuleScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

// Bottom Tabs Navigator
function HomeTabNavigator() {
  const currentUser = auth.currentUser;
  const [themePreference, setThemePreference] = useState<"dark" | "light">("dark");
  const [languagePreference, setLanguagePreference] = useState<"en" | "zh">("en");

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data();
      if (data?.themePreference) {
        setThemePreference(data.themePreference);
      }
      if (data?.languagePreference) {
        setLanguagePreference(data.languagePreference);
      }
    }, (error) => {
      console.log("[RootNavigator] HomeTabNavigator profile deleted or unauthorized:", error.message);
    });
    return unsub;
  }, [currentUser]);

  const isDark = themePreference !== "light";
  const colors = {
    tabBarBg: isDark ? "#131520" : "#FFFFFF",
    tabBarBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    inactiveTint: isDark ? "#606580" : "#A0A5C0",
  };

  const tabHome = languagePreference === "zh" ? "首页" : "Home";
  const tabBudget = languagePreference === "zh" ? "记账" : "Budget";
  const tabMemories = languagePreference === "zh" ? "记忆" : "Memories";
  const tabSettings = languagePreference === "zh" ? "设置" : "Settings";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#FF5E7E",
        tabBarInactiveTintColor: colors.inactiveTint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: tabHome,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarLabel: tabBudget,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MemoryCapsule"
        component={MemoryCapsuleScreen}
        options={{
          tabBarLabel: tabMemories,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: tabSettings,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function RootNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);    // Fixed: typed as User | null instead of any
  const [hasGroup, setHasGroup] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true); // Fixed: initialize to true to prevent race flash
  const [themePreference, setThemePreference] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        // If signed out, immediately clear loading states
        setLoadingProfile(false);
        setHasGroup(false);
      }
      setInitializing(false);
    });

    return unsubscribeAuth;
  }, []);

  // Listen to Firestore profile to check pairing status when user is authenticated
  useEffect(() => {
    if (!user) return;

    setLoadingProfile(true);
    const unsubscribeProfile = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          // User has access if they are paired or playing solo (any groupId)
          setHasGroup(!!profileData?.groupId);
          if (profileData?.themePreference) {
            setThemePreference(profileData.themePreference);
          }
        } else {
          setHasGroup(false);
        }
        setLoadingProfile(false);
      },
      (error) => {
        console.error("[RootNavigator] Error fetching user profile:", error);
        setLoadingProfile(false);
      }
    );

    return unsubscribeProfile;
  }, [user]);

  if (initializing || loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5E7E" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={themePreference === "light" ? "dark" : "light"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack — unauthenticated users
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !hasGroup ? (
          // Pairing Stack — authenticated but not yet linked with a group/partner
          <Stack.Screen name="Pairing" component={PairingScreen} />
        ) : (
          // Main App — authenticated and has a group (paired or solo)
          <Stack.Screen name="HomeTabs" component={HomeTabNavigator} />
        )}
      </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0B10",
    justifyContent: "center",
    alignItems: "center",
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconActive: {
    backgroundColor: "rgba(255, 94, 126, 0.12)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
