import React from "react";
import { LogBox } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";

// Suppress Expo Go notifications warnings in both the UI overlay and Metro console
LogBox.ignoreLogs([
  "expo-notifications",
  "Android Push notifications",
  "removed from Expo Go",
]);

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
