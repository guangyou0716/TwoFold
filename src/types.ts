export interface MoodBattery {
  level: number;
  status: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null; // Firebase Auth may return null for social sign-ins
  displayName: string;
  avatarUrl?: string;
  partnerId?: string;
  groupId?: string;
  fcmToken?: string;
  moodBattery?: MoodBattery;
  createdAt: string;
}

export interface GroupProfile {
  groupId: string;
  partnerAId: string;
  partnerBId: string;
  balances: {
    [userId: string]: number; // Points balance per partner
  };
  streaks: {
    choreStreak: number;
    lastChoreDate: string | null; // null = no chore completed yet
  };
  createdAt: string;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  pointsValue: number;
  createdBy: string;
  assignedTo?: string;
  status: "pending" | "completed";
  completedBy?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Reward {
  id: string;
  groupId: string;
  title: string;
  description: string;
  pointsCost: number;
  createdBy: string;
  status: "active" | "archived";
  createdAt: string;
}

// A coupon that has been purchased by a partner from the Reward Shop
export interface PurchasedCoupon {
  id: string;
  groupId: string;
  rewardId: string;
  buyerId: string;
  title: string;
  pointsSpent: number;
  status: "active" | "redeemed"; // redeemed = honored by partner
  createdAt: string;
  redeemedAt?: string;
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

// Navigation Param Lists
export type RootStackParamList = {
  Welcome: undefined;
  Auth: { isSignUp: boolean };
  Pairing: undefined;
  HomeTabs: undefined;
};

export type HomeTabParamList = {
  Dashboard: undefined;
  RewardShop: undefined;
  MemoryCapsule: undefined;
};
