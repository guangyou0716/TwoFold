import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, LogBox } from "react-native";
import * as Notifications from "expo-notifications";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { RootStackParamList, HomeTabParamList } from "../types";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme";
import { useUserProfile } from "../hooks/useUserProfile";
import { ErrorState } from "../components/primitives/ErrorState";
import { GlassTabBar } from "./GlassTabBar";
import type { UserProfile } from "../types";
import WelcomeScreen from "../screens/WelcomeScreen";
import AuthScreen from "../screens/AuthScreen";
import PairingScreen from "../screens/PairingScreen";
import DashboardScreen from "../screens/DashboardScreen";
import BudgetScreen from "../screens/BudgetScreen";
import MemoryCapsuleScreen from "../screens/MemoryCapsuleScreen";
import SettingsScreen from "../screens/SettingsScreen";

LogBox.ignoreLogs(["expo-notifications"]);

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

// Bottom Tabs Navigator — uses the L2 glass dock instead of colored dots.
function HomeTabNavigator({ profile }: { profile: UserProfile | null }) {
  const { tokens } = useTheme();
  const lang = profile?.languagePreference ?? "en";

  const tabLabels: Record<keyof HomeTabParamList, string> = {
    Dashboard: lang === "zh" ? "首页" : "Home",
    Budget: lang === "zh" ? "记账" : "Budget",
    MemoryCapsule: lang === "zh" ? "记忆" : "Memories",
    Settings: lang === "zh" ? "设置" : "Settings",
  };

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: tokens.colors.surface },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: tabLabels.Dashboard }} />
      <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarLabel: tabLabels.Budget }} />
      <Tab.Screen name="MemoryCapsule" component={MemoryCapsuleScreen} options={{ tabBarLabel: tabLabels.MemoryCapsule }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: tabLabels.Settings }} />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function RootNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { profile, loading: loadingProfile, error: profileError } = useUserProfile(user);
  const { tokens, scheme, setPreference } = useTheme();

  const previousUserId = useRef<string | null>(null);
  const previousGroupId = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setInitializing(false);
    });
    return unsubscribeAuth;
  }, []);

  // Drop device-local reminder alarms when this phone signs out, or when a
  // shared group becomes a private solo group (unlink / partner account delete).
  // The first paint has no previous id, so a cold start does not cancel alarms.
  useEffect(() => {
    const nextUserId = user?.uid ?? null;
    if (previousUserId.current && !nextUserId) {
      void Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    }
    previousUserId.current = nextUserId;
  }, [user]);

  useEffect(() => {
    // Ignore the null profile while auth or the user doc is reloading. Cancelling
    // on that gap would wipe alarms every time the auth user object changes.
    if (!profile) return;
    const nextGroupId = profile.groupId ?? "";
    const prev = previousGroupId.current;
    const leftSharedGroup = !!prev
      && prev.startsWith("group_")
      && (nextGroupId.startsWith("solo_") || nextGroupId === "");
    if (leftSharedGroup) {
      void Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    }
    previousGroupId.current = nextGroupId || null;
  }, [profile]);

  // Seed theme preference from Firestore profile once available.
  useEffect(() => {
    if (profile?.themePreference) {
      setPreference(profile.themePreference);
    }
  }, [profile?.themePreference, setPreference]);

  if (initializing || (user && loadingProfile)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tokens.colors.canvas }]}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
      </View>
    );
  }

  // Authenticated but profile missing/forbidden → recoverable error, not a hang.
  if (user && profileError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tokens.colors.canvas }]}>
        <ErrorState
          title="Profile unavailable"
          message="We couldn't load your profile. Please sign out and back in."
          retryLabel="Sign out"
          onRetry={() => signOut(auth)}
        />
      </View>
    );
  }

  const hasGroup = !!profile?.groupId;

  return (
    <>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : !hasGroup ? (
          <Stack.Screen name="Pairing" component={PairingScreen} />
        ) : (
          <Stack.Screen name="HomeTabs">
            {() => <HomeTabNavigator profile={profile} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
