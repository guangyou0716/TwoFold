import React from "react";
import { SafeAreaView, ActivityIndicator, StyleSheet } from "react-native";
import type { DashboardColors } from "./DashboardColors";

export interface DashboardSkeletonProps {
  colors: DashboardColors;
}

/** Loading shell for the dashboard — keeps the loading state visually bounded. */
export function DashboardSkeleton({ colors }: DashboardSkeletonProps) {
  return (
    <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#FF5E7E" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DashboardSkeleton;