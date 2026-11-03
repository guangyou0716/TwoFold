import React from "react";
import { LogBox, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme";
import RootNavigator from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/primitives/ErrorBoundary";
import { ConnectionBanner } from "./src/components/primitives/ConnectionBanner";

// Suppress Expo Go notifications warnings in both the UI overlay and Metro console
LogBox.ignoreLogs([
  "expo-notifications",
  "Android Push notifications",
  "removed from Expo Go",
]);

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={styles.root}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <ConnectionBanner />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});