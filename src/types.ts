export interface UserProfile {
  uid: string;
  email: string | null; // Firebase Auth may return null for social sign-ins
  displayName: string;
  avatarUrl?: string;
  partnerId?: string;
  groupId?: string;
  fcmToken?: string;
  createdAt: string;
  isSolo?: boolean;
  themePreference?: "dark" | "light"; // "dark" by default, can be toggled to "light"
  currencyPreference?: string; // e.g. "$", "€", "¥", "RM", "NT$"
  timezoneLocation?: string; // e.g. "device", "Malaysia (UTC+8)"
  isNewUser?: boolean;
  languagePreference?: "en" | "zh";
}

export interface GroupProfile {
  groupId: string;
  partnerAId: string;
  partnerBId: string;
  balances: {
    [userId: string]: number; // Points balance per partner
  };
  budgetBalance?: number; // Shared financial budget balance (monitored on Budget page)
  streaks: {
    choreStreak: number;
    lastChoreDate: string | null; // null = no chore completed yet
  };
  featuredMilestoneId?: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  createdBy: string;
  dueDate: string; // YYYY-MM-DD format (selected by calendar)
  dueTime?: string; // HH:MM
  isAllDay: boolean;
  remindTiming: "at_time" | "1_hour_before" | "1_day_before" | "2_days_before" | "1_week_before" | "none";
  status: "pending" | "completed";
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  notificationId?: string | null;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
}

export interface Transaction {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  paidBy: string; // userId
  date: string; // YYYY-MM-DD
  createdAt: string;
  recurrence?: "none" | "monthly";
  isTemplate?: boolean; // If true, this is a hotkey template, not a transaction log
  nextTriggerDate?: string; // For recurring transactions: YYYY-MM-DD
}
export interface Milestone {
  id: string;
  groupId: string;
  title: string;
  date: string; // ISO string
  isCountdown: boolean;
  themeColor: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  milestoneId: string;
  groupId: string;
  type: "video" | "image" | "text";
  mediaUrl?: string | null;
  textContent: string;
  uploadedBy: string;
  createdAt: string;
}

// Type of nudge sent from one partner to another
export type NudgeType = "hug" | "poke" | "coffee" | "love" | "chore_reminder";

export interface SavingsGoal {
  id: string;
  groupId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null; // YYYY-MM-DD (optional)
  createdAt: string;
}

// Navigation Param Lists
export type RootStackParamList = {
  Welcome: undefined;
  Auth: { isSignUp: boolean; initialLang?: "en" | "zh" };
  Pairing: undefined;
  HomeTabs: undefined;
};

export type HomeTabParamList = {
  Dashboard: undefined;
  Budget: undefined;
  MemoryCapsule: undefined;
  Settings: undefined;
};
