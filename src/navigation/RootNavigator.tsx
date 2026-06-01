import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { RootStackParamList, HomeTabParamList } from "../types";

// Import Screens
import WelcomeScreen from "../screens/WelcomeScreen";
import AuthScreen from "../screens/AuthScreen";
import PairingScreen from "../screens/PairingScreen";
import DashboardScreen from "../screens/DashboardScreen";
import RewardShopScreen from "../screens/RewardShopScreen";
import MemoryCapsuleScreen from "../screens/MemoryCapsuleScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

// Bottom Tabs Navigator
function HomeTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#131520",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.05)",
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#FF5E7E",
        tabBarInactiveTintColor: "#606580",
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
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="RewardShop"
        component={RewardShopScreen}
        options={{
          tabBarLabel: "Rewards",
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
          tabBarLabel: "Memories",
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
  const [isPaired, setIsPaired] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true); // Fixed: initialize to true to prevent race flash

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        // If signed out, immediately clear loading states
        setLoadingProfile(false);
        setIsPaired(false);
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
          // User is paired if they have both partnerId and groupId
          setIsPaired(!!(profileData?.groupId && profileData?.partnerId));
        } else {
          setIsPaired(false);
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth Stack — unauthenticated users
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </>
      ) : !isPaired ? (
        // Pairing Stack — authenticated but not yet linked with partner
        <Stack.Screen name="Pairing" component={PairingScreen} />
      ) : (
        // Main App — authenticated and paired
        <Stack.Screen name="HomeTabs" component={HomeTabNavigator} />
      )}
    </Stack.Navigator>
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
