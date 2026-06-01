import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore – getReactNativePersistence is exported but typedefs lag behind in firebase JS SDK
import { initializeAuth, getAuth, getReactNativePersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ---------------------------------------------------------------------------
// Firebase Config — loaded from Expo extra / environment variables
// Set these in app.json under expo.extra, or via .env.local with EXPO_PUBLIC_ prefix
// ---------------------------------------------------------------------------
const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey:            extra.firebaseApiKey            ?? "REPLACE_ME_FIREBASE_API_KEY",
  authDomain:        extra.firebaseAuthDomain        ?? "REPLACE_ME.firebaseapp.com",
  projectId:         extra.firebaseProjectId         ?? "REPLACE_ME_PROJECT_ID",
  storageBucket:     extra.firebaseStorageBucket     ?? "REPLACE_ME.appspot.com",
  messagingSenderId: extra.firebaseMessagingSenderId ?? "REPLACE_ME_SENDER_ID",
  appId:             extra.firebaseAppId             ?? "REPLACE_ME_APP_ID",
};

// ---------------------------------------------------------------------------
// Initialize Firebase — guard against hot-reload re-initialization
// initializeAuth can only be called once per app instance; subsequent calls
// during React Native Fast Refresh will throw 'auth/already-initialized'.
// ---------------------------------------------------------------------------
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

// Use initializeAuth only on first init; getAuth on subsequent hot reloads
const auth = isNewApp
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

// ---------------------------------------------------------------------------
// Local Firebase Emulator Suite
// ---------------------------------------------------------------------------
const USE_EMULATORS: boolean =
  (extra.useEmulators ?? process.env.EXPO_PUBLIC_USE_EMULATORS) === true ||
  (extra.useEmulators ?? process.env.EXPO_PUBLIC_USE_EMULATORS) === "true";

// Module-level flag ensures emulators are only connected once even on hot reload
let emulatorsConnected = false;

if (USE_EMULATORS && !emulatorsConnected) {
  emulatorsConnected = true;
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";

  console.info(`[Firebase] 🔧 Connecting to local emulators at: ${host}`);

  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: false });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
    console.info("[Firebase] ✅ All 3 emulators connected (Auth:9099, Firestore:8080, Storage:9199)");
  } catch (error) {
    console.warn("[Firebase] ⚠️  Emulator connection failed (may already be connected):", error);
  }
}

export { app, auth, db, storage };
