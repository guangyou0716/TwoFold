<div align="center">

# 💕 TwoFold

**Two Lives. One Story.**

A premium, real-time couple companion app built with React Native (Expo) and Firebase. Share reminders, track your shared budget, capture memories, and stay connected — together, in sync.

[![Expo](https://img.shields.io/badge/Expo-54.0.0-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12.14.0-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## ✨ Features

### 💞 Couple Pairing
- Unique invite code system — each user gets a personal partner code
- Real-time pairing via Firestore — linking is instant and live
- Solo Mode available — use all features independently and pair later
- Invite codes are cryptographically unique and can only be used once
- **Race-Condition-Resistant Pairing** — linking is atomically processed via a custom Firestore transaction, locking reads before writes to prevent concurrent BOLA and simultaneous pairing exploits

### 📋 Reminders & Chores
- Shared real-time checklist synced between both partners
- Recurring reminders — set tasks as **daily**, **weekly**, or **monthly**
- Local push notifications with configurable advance warnings (at time, 1 hour, 1 day, 1 week)
- Full edit and history log for completed tasks

### 💰 Shared Budget
- Shared pool balance with configurable monthly starting allowance
- Transaction log with categories, types (income/expense), date filtering
- **⚡ Quick Presets (Hotkeys)** — save common transactions for one-tap logging
- **🔁 Monthly Recurring Transactions** — auto-log fixed monthly income/expenses
- **🐷 Savings Goals** — target amount + optional deadline, visual progress bars, deposit/withdraw with ledger sync
- **📸 AI Receipt Scanner** — scan any receipt with your camera or photo library; powered by **Gemini 3.1 Flash-Lite**, auto-fills description, amount, category, date, and expense/income type

### 📅 Memory Capsule
- Shared scrapbook of love notes (Photo/video upload is currently disabled to conserve free hosting storage limits and is slated for future development)
- Milestone tracking — past anniversaries ("days together") and future countdowns
- Auto-countdown to special dates (e.g. "Next Anniversary in 47 days")
- Custom milestone editing with relative time display

### 🏠 Home Dashboard
- Featured milestone widget with countdown/count-up timer
- Remaining shared budget balance summary
- Savings Goals progress widget with linear progress bars
- Live nudge system — send emoji-based push nudges to your partner (❤️ Hug, 🔔 Poke, ☕ Coffee, 🌙 Miss You)
- Active reminders checklist summary

### ⚙️ Settings
- Display name customization
- Dark / Light mode theme
- Shared budget currency (RM, $, €, £, ¥, and more)
- Reminder timezone configuration
- **🌐 Language selector** — full English & Chinese (中文) support across the entire app
- Partner link/unlink management

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) SDK 54 (React Native 0.81.5) |
| Language | TypeScript 5.9 |
| Database | [Firebase Firestore](https://firebase.google.com/products/firestore) (JS SDK v12) |
| Auth | Firebase Authentication (Email/Password) |
| Storage | Firebase Storage (for photo/video memories) |
| Navigation | React Navigation v7 (Bottom Tabs + Native Stack) |
| Notifications | `expo-notifications` |
| Image Picker | `expo-image-picker` |
| Media Playback | `expo-av`, `expo-video` |
| AI OCR | [Google Gemini 3.1 Flash-Lite](https://ai.google.dev) via REST API |
| Persistence | `@react-native-async-storage/async-storage` |
| Date Picker | `@react-native-community/datetimepicker` |

---

## 🗂️ Project Structure

```
twofold/
├── App.tsx                        # App root
├── index.ts                       # Entry point
├── firebaseConfig.ts              # Firebase initialization (reads from .env.local)
├── firestore.rules                # Production Firestore security rules
├── app.json                       # Expo config (bundle ID, permissions, plugins)
├── package.json
├── tsconfig.json
├── .env.local                     # ⚠️ Secret — gitignored, never commit this
├── .gitignore
└── src/
    ├── types.ts                   # Shared TypeScript interfaces
    ├── navigation/
    │   └── RootNavigator.tsx      # Navigation stack & tab bar
    ├── screens/
    │   ├── WelcomeScreen.tsx      # Landing / onboarding
    │   ├── AuthScreen.tsx         # Sign up / Log in
    │   ├── PairingScreen.tsx      # Partner invite code pairing
    │   ├── DashboardScreen.tsx    # Home dashboard
    │   ├── BudgetScreen.tsx       # Shared budget & AI receipt scanner
    │   ├── MemoryCapsuleScreen.tsx # Scrapbook milestones & memories
    │   └── SettingsScreen.tsx     # Profile & preferences
    └── utils/
        └── translations.ts        # EN / ZH bilingual localization strings
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/go) app on your iOS/Android device (for local testing)
- A [Firebase](https://console.firebase.google.com) project with:
  - **Authentication** (Email/Password) enabled
  - **Firestore Database** created
  - **Firebase Storage** enabled
- A [Google AI Studio](https://aistudio.google.com) API key (free) for the AI receipt scanner

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/twofold.git
cd twofold
npm install
```

### 2. Configure Environment Variables

Copy the example below into a new file named `.env.local` in the project root. **Never commit this file.**

```env
# Firebase project credentials (from Firebase Console → Project Settings)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=1:your_app_id

# Google Gemini API key (from https://aistudio.google.com — 100% free tier)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Set to "true" to connect to local Firebase emulators during development
EXPO_PUBLIC_USE_EMULATORS=false
```

### 3. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools
firebase login

# Deploy the production security rules
npx firebase-tools deploy --only firestore:rules
```

### 4. Run the App

```bash
# Start the Expo development server
npm start

# Or run directly on a platform
npm run android    # Android
npm run ios        # iOS
npm run web        # Web browser
```

---

## 🔐 Security

TwoFold is designed with security as a first-class concern.

### Firebase Credentials
- All Firebase config values are loaded from `EXPO_PUBLIC_*` environment variables in `.env.local`
- The `.env.local` file is listed in `.gitignore` and will **never** be committed to version control
- No secrets are hardcoded anywhere in the source code

### Firestore Security Rules
All database access is protected by strict production-grade Firestore security rules (`firestore.rules`):

| Collection | Access Control |
|------------|---------------|
| `/users/{uid}` | Owner only; partner can read their partner's profile via stored `partnerId` |
| `/groups/{groupId}` | Group members only, verified via `isMemberOfGroup()` helper |
| `/tasks/{taskId}` | Group members only |
| `/transactions/{txId}` | Group members only |
| `/milestones/{milestoneId}` | Group members only |
| `/memories/{memoryId}` | Group members only |
| `/savings_goals/{goalId}` | Group members only |
| `/nudges/{nudgeId}` | Sender can create; only recipient can mark as read; no deletion |
| All other paths | ❌ Denied by default catch-all rule |

### AI Receipt Scanner
- Receipt images are converted to base64 on-device and sent directly to the Gemini API over HTTPS
- Images are **never uploaded to Firebase Storage** for OCR purposes
- The Gemini API key is read from environment variables and never hardcoded

---

## 🌐 Localization

TwoFold supports **English (🇺🇸)** and **Chinese Simplified (🇨🇳)** out of the box. The language can be switched from the **Settings** screen and applies instantly across the entire app. All strings are managed in [`src/utils/translations.ts`](src/utils/translations.ts).

---

## 📸 AI Receipt Scanner

The receipt scanner uses the **free** [Google Gemini 3.1 Flash-Lite](https://aistudio.google.com) multimodal API to automatically extract:

| Field | Example |
|-------|---------|
| Description | `"Tan Kok Siang"` (for personal transfers) or `"McDonald's Dinner"` |
| Amount | `15.00` |
| Category | `Food`, `Groceries`, `Bills`, `Travel`, etc. |
| Date | `2026-05-31` (from receipt/transaction date) |
| Type | `expense` or `income` (intelligently classified) |

The scanner correctly handles bank transfer screenshots (DuitNow, e-wallet), retail receipts, and payslips/income documents.

**Free tier limits (Google AI Studio):**
- 15 requests per minute
- 1,000 requests per day
- No credit card required

---

## 📦 Available Scripts

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run android    # Open on Android emulator / device
npm run ios        # Open on iOS simulator / device
npm run web        # Open in web browser
npx tsc --noEmit   # Type-check without building
```

---

## 🗄️ Firebase Free Tier Limits

TwoFold is designed to run well within Firebase's generous free (Spark) plan:

| Resource | Free Limit |
|----------|-----------|
| Firestore Storage | 1 GiB total |
| Firestore Reads | 50,000 / day |
| Firestore Writes | 20,000 / day |
| Firestore Deletes | 20,000 / day |
| Storage (photos/video) | 5 GB total |
| Authentication | Unlimited |

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with 💕 for couples everywhere

</div>
