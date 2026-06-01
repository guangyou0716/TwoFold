import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

const FEATURE_CARDS = [
  {
    icon: "✅",
    title: "Real-time Chores",
    description: "Sync daily tasks instantly. Complete chores, share the load, and earn points together.",
    accentColor: "rgba(52, 199, 89, 0.08)",
    borderAccent: "rgba(52, 199, 89, 0.15)",
  },
  {
    icon: "🎁",
    title: "Reward Economy",
    description: "Earn points for completing chores. Spend them on custom coupons created by your partner.",
    accentColor: "rgba(255, 94, 126, 0.08)",
    borderAccent: "rgba(255, 94, 126, 0.15)",
  },
  {
    icon: "💖",
    title: "Memory Scrapbooks",
    description: "Count days since your first date, countdown to your wedding. Pin videos and photo memories.",
    accentColor: "rgba(90, 120, 255, 0.08)",
    borderAccent: "rgba(90, 120, 255, 0.15)",
  },
];

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>TwoFold</Text>
          <Text style={styles.tagline}>Together, in Sync & Play</Text>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.cardContainer}>
          {FEATURE_CARDS.map((card) => (
            <View
              key={card.title}
              style={[
                styles.card,
                {
                  backgroundColor: card.accentColor,
                  borderColor: card.borderAccent,
                },
              ]}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Auth", { isSignUp: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started Together</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Auth", { isSignUp: false })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: "#A0A5C0",
    marginTop: 8,
    fontWeight: "500",
  },
  cardContainer: {
    width: "100%",
    marginVertical: 40,
    gap: 14,
  },
  card: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: "#A0A5C0",
    lineHeight: 20,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#FF5E7E",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5E7E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: "100%",
    height: 56,
    backgroundColor: "transparent",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  secondaryButtonText: {
    color: "#A0A5C0",
    fontSize: 16,
    fontWeight: "600",
  },
});
