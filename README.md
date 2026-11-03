<div align="center">

# 💕 TwoFold

**Two Lives. One Story.**

A premium, real-time couple companion app built with React Native (Expo) and Firebase. Share reminders, track your shared budget, capture memories, and stay connected — together, in sync.

[![Expo](https://img.shields.io/badge/Expo-56.0.0-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.85.3-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12.14.0-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

<img width="941" height="1672" alt="image" src="https://github.com/user-attachments/assets/046ba70d-6c8c-4798-9687-e3a0a824d6ae" />

---

## ✨ Features

### 💞 Couple Pairing
- Unique invite code system — each user gets a personal partner code
- Real-time pairing via Firestore — linking is instant and live
- Solo Mode available — use all features independently and pair later
- Invite codes are cryptographically unique and can only be used once
- **Race-Condition-Resistant Pairing** — linking uses a short-lived, single-use invite and an atomic trusted backend transaction

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
- Shared scrapbook of love notes with milestone tracking
- Photo/video media uploads are currently **disabled** (media entry shows "Coming Soon") to stay within the free storage quota — see [Roadmap](#-roadmap)
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
- **📥 GDPR Data Portability (Data Export)** — package and export all of your profile parameters and financial/milestone logs in JSON format using a native share sheet
- **⚠️ Thorough Account Deletion (Right to Erasure)** — deleting a solo account thoroughly erases your group, budget logs, reminders, timeline notes, and savings goals from our cloud servers to prevent orphaned records

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) SDK 56 (React Native 0.85, react-native-web) |
| Language | TypeScript 6 |
| Database | [Firebase Firestore](https://firebase.google.com/products/firestore) (JS SDK v12) |
| Auth | Firebase Authentication (Email/Password) |
| Storage | Firebase Storage (for photo/video memories) |
| Navigation | React Navigation v7 (Bottom Tabs + Native Stack) |
| Notifications | `expo-notifications` |
| Image Picker | `expo-image-picker` |
| Media Playback | `expo-video` |
| AI OCR | [Google Gemini 3.1 Flash-Lite](https://ai.google.dev) via a Firebase callable function |
| Persistence | `@react-native-async-storage/async-storage` |
| Date Picker | `@react-native-community/datetimepicker` |

---

## 🗂️ Project Structure

```
twofold/
├── App.tsx                        # App root (providers: safe-area, theme, navigation)
├── index.ts                       # Entry point
├── firebaseConfig.ts              # Firebase initialization (reads from .env.local)
├── firestore.rules                # Production Firestore security rules
├── storage.rules                  # Production Storage security rules
├── app.json                       # Expo config (bundle ID, permissions, plugins)
├── eas.json                       # EAS Build & Submit configurations (development, preview, production)
├── functions/                     # Firebase Cloud Functions (OCR, invites, recurring, export/delete)
├── tests/rules/                   # Firestore + Storage rules emulator tests
├── package.json
├── tsconfig.json
├── .env.local                     # ⚠️ Secret — gitignored, never commit this
├── .gitignore
└── src/
    ├── types.ts                   # Shared TypeScript interfaces
    ├── theme/                     # Design tokens, ThemeProvider, useTheme, icon map
    ├── components/
    │   ├── primitives/            # AppText, AppIcon, FormField, EmptyState, ErrorState…
    │   └── material/              # LiquidGlassSurface, MaterialCard, GlassBottomBar…
    ├── hooks/
    │   ├── useUserProfile.ts      # Current-user profile subscription
    │   ├── useUserProfileById.ts  # Any user doc (partner display)
    │   ├── useGroup.ts            # Group doc subscription
    │   ├── useTasks.ts            # Tasks / reminders
    │   ├── useMilestones.ts       # Milestones
    │   ├── useSavingsGoals.ts     # Savings goals
    │   ├── useTransactions.ts     # Transaction ledger
    │   ├── useGroupCollection.ts  # Shared groupId-scoped listener
    │   ├── useConnectivity.ts     # Online/offline state
    │   └── useNotificationPermissions.ts # First-need permission handling
    ├── features/
    │   ├── dashboard/components/  # ExecutiveHeader, MilestoneHero, BudgetSummary,
    │   │                          # SavingsGoalsPreview, NudgeBar, ReminderList, Skeleton
    │   ├── budget/components/     # BalanceHero, PeriodSelector, QuickPresets,
    │                              # SavingsGoalCarousel, TransactionLedger, TransactionRow
    │   ├── settings/components/   # ProfileCard, PasswordCard, PreferencesCard,
    │                              # RelationshipCard, DangerZone
    │   └── memories/components/   # MilestoneCarousel, MemoryFeed, VideoMemoryPlayer
    ├── services/
    │   └── ocr.ts                 # Server-backed receipt scan client
    ├── navigation/
    │   └── RootNavigator.tsx      # Navigation stack & GlassTabBar dock
    ├── screens/
    │   ├── WelcomeScreen.tsx      # Landing / onboarding
    │   ├── AuthScreen.tsx         # Sign up / Log in
    │   ├── PairingScreen.tsx      # Partner invite code pairing
    │   ├── DashboardScreen.tsx    # Home dashboard
    │   ├── BudgetScreen.tsx       # Shared budget & AI receipt scanner
    │   ├── MemoryCapsuleScreen.tsx # Scrapbook milestones & memories
    │   └── SettingsScreen.tsx     # Profile & preferences
    └── utils/
        ├── currency.ts            # Minor-unit money helpers
        ├── dates.ts               # Date/countdown helpers
        ├── validation.ts          # Form + OCR result validation
        ├── translations.ts        # EN / ZH bilingual localization strings
        └── __tests__/             # Unit tests (currency, dates, validation)
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

# Set to "true" to connect to local Firebase emulators during development
EXPO_PUBLIC_USE_EMULATORS=false
```

> ⚠️ There is **no** Gemini/LLM key in the app. Receipt OCR runs in a Firebase
> callable function; the API key lives in `firebase functions:secrets:set GEMINI_API_KEY`.

### 3. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools
firebase login

# Store the OCR secret in Functions, then deploy rules, storage, and backend
firebase functions:secrets:set GEMINI_API_KEY
npx firebase-tools deploy --only firestore:rules,storage,functions
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

- **🛡️ Group Spoofing Prevention:** Clients can only enter their own `solo_${uid}` group or clear their relationship state. Pairing is performed by the trusted invite callable, not by client profile edits.
- **🔗 Invite Claim Guard:** Invite codes are short-lived, single-use, and claimed in a backend transaction, preventing concurrent linking hijacking without exposing Firebase UIDs.

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
 - Receipt images are uploaded to the caller's bounded temporary Storage path and deleted after processing
 - OCR runs in a Firebase callable function; the Gemini API key stays in the Functions environment
 - OCR results are schema-validated and returned for user confirmation before ledger save

---

## 🌐 Localization

TwoFold supports **English (🇺🇸)** and **Chinese Simplified (🇨🇳)** out of the box. The language can be switched from the **Settings** screen and applies instantly across the entire app. All strings are managed in [`src/utils/translations.ts`](src/utils/translations.ts).

---

## 📸 AI Receipt Scanner

The receipt scanner uses a Firebase callable and a server-side [Google Gemini](https://ai.google.dev/) multimodal model to automatically extract:

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
npm start              # Start Expo dev server (scan QR with Expo Go)
npm run android        # Open on Android emulator / device
npm run ios            # Open on iOS simulator / device
npm run web            # Open in web browser
npm run lint           # ESLint (flat config)
npm run typecheck      # tsc --noEmit
npm test               # Jest: utils/migration units + feature component tests (46)
npm run test:rules     # Firestore + Storage rules emulator tests (requires Java)
npm run doctor         # expo-doctor dependency health check
npm run build          # Export a static web bundle (output in dist/, gitignored)
cd functions && npm test   # Cloud Functions unit tests (recurrence, invites, OCR schema)
eas build --profile production # Build a production release binary via EAS
eas submit -p all      # Submit builds directly to Play Store / App Store
```

> `npm run test:rules` boots the Firestore/Storage emulators and needs a local
> Java runtime (JVM). It validates the security-rules matrix in `tests/rules/`.

---

## 🗺️ Roadmap

Features that are planned but not yet shipped (kept honest — README claims match
the shipped app):

- **On-device verification** — the SDK 54 → 56 migration is complete at the
  dependency/config level (expo-doctor 21/22, remaining check is the known
  Hermes V1 memory regression that requires SDK 57). Cold-start, deep links,
  notifications and auth persistence still need a final pass on a real device.
- **Native Liquid Glass surfaces** — `expo-glass-effect` is installed; the
  `LiquidGlassSurface` adapter renders native glass on iOS 26+ and falls back
  to `BlurView`/opaque elsewhere. Visual/QA verification on device pending.
- **Invite-code pairing** — shipped: both pairing flows call the
  `createInvite`/`claimInvite` callables. A solo group is not treated as
  already paired, and solo tasks, ledger, milestones, and goals move into the
  new pair group. `firestore.rules` restricts client-side group creation to
  the caller's own solo group (pair groups are callable-only).
- **Recurring transactions** — shipped: the client writes a `recurrences` rule
  (no instance generation) and the scheduled `processRecurrences` function
  creates deterministic, idempotent instances (`ruleId_YYYY-MM-DD`).
- **Savings goals** — funding/withdrawal now runs in a Firestore transaction
  (re-read + write) so two partners depositing concurrently cannot overwrite
  each other.
- **Memory photo/video uploads** — intentionally disabled ("Coming Soon") to
  stay within free storage quotas; Storage rules/upload paths are ready.
- **Account export/delete backend jobs** — Settings calls `startAccountJob` /
  `getJobStatus`. Deleting a paired account hands the shared history to the
  remaining partner's solo group. A solo delete still erases that group.
  Unlink uses `unlinkPartner`, which keeps a private snapshot for each person.
- **Reminder notifications** — permission is requested on first need. Tapping a
  reminder opens that item. Scheduled alarms are cancelled on logout and when
  a shared group becomes solo (unlink or the other partner deleting).
- **Screen decomposition (in progress)** — Dashboard, Settings and Memory are
  decomposed into `features/*/components`; Dashboard is driven by per-domain
  hooks (tasks/milestones/savings/transactions/group) with loading/error/retry,
  and Budget's main content lives in `features/budget/components`. Remaining:
  Budget's form sheets (add/recurring/scan — heavily form-state-coupled) and
  moving Budget's optimistic mutation handlers onto the hooks.
- **Re-paint to the design tokens** — the feature components read a per-screen
  palette contract today; the plan's muted-rose `src/theme/tokens.ts` palette
  and the legacy pink palette differ, so the app-wide re-paint needs a device
  review before switching.

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
