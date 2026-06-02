import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { UserProfile, GroupProfile, Transaction, SavingsGoal } from "../types";
import { translations } from "../utils/translations";
import * as ImagePicker from "expo-image-picker";

const CATEGORIES = [
  { label: "Food 🍔", value: "Food" },
  { label: "Groceries 🛒", value: "Groceries" },
  { label: "Rent/Bills 🏠", value: "Bills" },
  { label: "Entertainment 🎬", value: "Entertainment" },
  { label: "Travel/Transport ✈️", value: "Travel" },
  { label: "Shopping 🛍️", value: "Shopping" },
  { label: "Savings 🐷", value: "Savings" },
  { label: "Income 💰", value: "Income" },
  { label: "Other ❓", value: "Other" }
];

export default function BudgetScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const processedRecurringRef = useRef(false);

  // Helper variables and localization hooks
  const lang = userProfile?.languagePreference ?? "en";
  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  }, [lang]);

  const getCategoryLabel = (val: string) => {
    switch (val) {
      case "Food": return t("categoryFood");
      case "Groceries": return t("categoryGroceries");
      case "Bills": return t("categoryBills");
      case "Entertainment": return t("categoryEntertainment");
      case "Travel": return t("categoryTravel");
      case "Shopping": return t("categoryShopping");
      case "Savings": return lang === "zh" ? "储蓄 🐷" : "Savings 🐷";
      case "Income": return t("categoryIncome");
      default: return t("categoryOther");
    }
  };

  // Filter
  const [budgetFilter, setBudgetFilter] = useState<"all" | "daily" | "monthly" | "yearly">("all");
  const [customFilterDate, setCustomFilterDate] = useState<Date>(new Date());
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);

  // Modals
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);

  // New Transaction form
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txCategory, setTxCategory] = useState("Food");
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [showTxDatePicker, setShowTxDatePicker] = useState(false);
  const [presets, setPresets] = useState<Transaction[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [txRecurrence, setTxRecurrence] = useState<"none" | "monthly">("none");
  const [scanning, setScanning] = useState(false);

  // Edit Allowance form
  const [newAllowance, setNewAllowance] = useState("");

  // Savings Goals states
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsGoalModalVisible, setSavingsGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTargetAmount, setNewGoalTargetAmount] = useState("");
  const [newGoalCurrentAmount, setNewGoalCurrentAmount] = useState("");
  const [newGoalTargetDate, setNewGoalTargetDate] = useState<Date | null>(null);
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Add/Deduct Funds Modal states
  const [fundsModalVisible, setFundsModalVisible] = useState(false);
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<SavingsGoal | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsAction, setFundsAction] = useState<"add" | "deduct">("add");

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      setUserProfile(snap.data() as UserProfile ?? null);
    });
    return unsub;
  }, [currentUser]);

  // Load partner profile
  useEffect(() => {
    if (!userProfile?.partnerId) {
      setPartnerProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", userProfile.partnerId), (snap) => {
      setPartnerProfile(snap.data() as UserProfile ?? null);
    });
    return unsub;
  }, [userProfile?.partnerId]);

  // Load group and transactions
  useEffect(() => {
    if (!userProfile?.groupId || !currentUser) return;

    setLoading(true);
    const unsubGroup = onSnapshot(doc(db, "groups", userProfile.groupId), (snap) => {
      setGroup(snap.data() as GroupProfile ?? null);
    });

    const q = query(
      collection(db, "transactions"),
      where("groupId", "==", userProfile.groupId)
    );

    // Process recurring transactions
    const processRecurringTransactions = async (allTransactions: Transaction[]) => {
      if (processedRecurringRef.current) return;
      processedRecurringRef.current = true;

      const recurring = allTransactions.filter(t => t.recurrence === "monthly" && t.nextTriggerDate && !t.isTemplate);
      if (recurring.length === 0) return;

      const todayStr = new Date().toISOString().split("T")[0];
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const rec of recurring) {
        let nextDate = rec.nextTriggerDate!;
        let currentChanges = false;

        // If the next trigger date is today or in the past, trigger it!
        while (nextDate <= todayStr) {
          const newDocRef = doc(collection(db, "transactions"));
          batch.set(newDocRef, {
            groupId: userProfile.groupId,
            title: `${rec.title} (Recurring)`,
            amount: rec.amount,
            type: rec.type,
            category: rec.category,
            paidBy: rec.paidBy || currentUser.uid,
            date: nextDate,
            createdAt: new Date().toISOString(),
            isTemplate: false
          });

          // Advance next trigger date by 1 month
          const d = new Date(nextDate);
          d.setMonth(d.getMonth() + 1);
          nextDate = d.toISOString().split("T")[0];
          hasChanges = true;
          currentChanges = true;
        }

        if (currentChanges) {
          batch.update(doc(db, "transactions", rec.id), {
            nextTriggerDate: nextDate
          });
        }
      }

      if (hasChanges) {
        try {
          await batch.commit();
          console.log("[Recurring] Automatically processed recurring transactions!");
        } catch (err) {
          console.error("[Recurring] Error processing recurring transactions:", err);
        }
      }
    };

    const unsubTx = onSnapshot(q, async (snap) => {
      const loaded: Transaction[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Transaction)
      );

      const normal = loaded.filter(t => !t.isTemplate);
      const templateList = loaded.filter(t => t.isTemplate === true);

      // Sort normal by transaction date descending
      normal.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(normal);
      setPresets(templateList);
      setLoading(false);

      // Process recurring transactions automatically in the background
      await processRecurringTransactions(loaded);
    }, (err) => {
      console.error("[Budget] Load transactions error:", err);
      setLoading(false);
    });

    const qSavings = query(
      collection(db, "savings_goals"),
      where("groupId", "==", userProfile.groupId)
    );

    const unsubSavings = onSnapshot(qSavings, (snap) => {
      const loaded: SavingsGoal[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SavingsGoal)
      );
      loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSavingsGoals(loaded);
    }, (err) => {
      console.error("[Budget] Load savings goals error:", err);
    });

    return () => {
      unsubGroup();
      unsubTx();
      unsubSavings();
    };
  }, [userProfile?.groupId, currentUser]);

  // Theme Styling Settings
  const isDark = userProfile?.themePreference !== "light";
  const colors = {
    background: isDark ? "#0A0B10" : "#F8F9FA",
    card: isDark ? "#131520" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A1C29",
    subtitle: isDark ? "#A0A5C0" : "#606580",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    activeTab: "#FF5E7E",
    tabBackground: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    inactiveText: isDark ? "#606580" : "#A0A5C0",
    inputBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    inputBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    placeholderText: isDark ? "#606580" : "#A0A5C0",
  };

  // Custom Currency symbol
  const activeCurrency = userProfile?.currencyPreference ?? "$";

  // Scan Receipt OCR implementation
  const handleScanReceipt = async () => {
    Alert.alert(
      t("budgetSelectSource"),
      t("budgetSelectSourceSub"),
      [
        {
          text: t("budgetUseCamera"),
          onPress: () => launchOCR("camera")
        },
        {
          text: t("budgetUseGallery"),
          onPress: () => launchOCR("gallery")
        },
        {
          text: t("cancel"),
          style: "cancel"
        }
      ]
    );
  };

  const launchOCR = async (source: "camera" | "gallery") => {
    try {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t("budgetPermissionCamera"), t("budgetPermissionCameraMsg"));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t("budgetPermissionMedia"), t("budgetPermissionMediaMsg"));
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      };

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert(t("error"), t("budgetScanFailed"));
        return;
      }

      // Client-side size guard — the Cloud Function also validates this
      const approximateSizeBytes = asset.base64.length * 0.75;
      if (approximateSizeBytes > 4 * 1024 * 1024) {
        Alert.alert(t("error"), t("budgetScanFailed"));
        console.warn("[OCR] Image too large —", Math.round(approximateSizeBytes / 1024), "KB");
        return;
      }

      setScanning(true);

      // Only use the dedicated Gemini key — never fall back to the Firebase key
      const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!API_KEY) {
        throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set. Please add it to your .env.local file.");
      }

      const prompt = "You are an expert receipt OCR scanner. Parse this receipt image and return a JSON object with: { title: string, amount: number, category: 'Food' | 'Groceries' | 'Bills' | 'Entertainment' | 'Travel' | 'Shopping' | 'Savings' | 'Income' | 'Other', date?: string, type: 'expense' | 'income' } where category MUST be one of those exact values. If the receipt represents money received, salary, a refund, or income, type MUST be 'income'. If it represents a purchase, bill, invoice, or expense paid, type MUST be 'expense'. For the title: identify the primary transaction partner, store, or person. If there is a personal transfer recipient or sender (e.g. 'Transfer To', 'Receive From', 'Paid To', 'Transfer From', 'Payment Details', 'Merchant', 'Vendor'), use their name as the title (e.g. 'Tan Kok Siang' or 'Lee Guang You') and capitalize it properly. Do NOT use generic transaction statuses, methods, or actions like 'Transfer to Wallet', 'eWallet Balance', 'DuitNow Received', 'DuitNow', 'Transfer Success', or 'Payment Details' as the title if a specific name is present. Keep the title short (2-3 words). The date field should be in YYYY-MM-DD format (representing the transaction/receipt date). If no date is found or readable, omit it. Return ONLY the raw JSON block without markdown formatting.";

      // Abort the request after 15 seconds to prevent the spinner hanging forever
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: asset.base64
                      }
                    }
                  ]
                }
              ]
            })
          }
        );
      } finally {
        clearTimeout(fetchTimeout);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error status:", response.status, errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        throw new Error("Invalid or empty response structure from Gemini API");
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      let cleanText = textResponse.trim();
      
      // Remove potential markdown wrappers
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);

      // Apply the fields to the form
      if (parsed.title) setTxTitle(parsed.title);
      if (parsed.amount !== undefined) setTxAmount(parsed.amount.toString());
      if (parsed.category) {
        const matchedCat = CATEGORIES.find(
          (c) => c.value.toLowerCase() === parsed.category!.toLowerCase()
        );
        setTxCategory(matchedCat ? matchedCat.value : "Other");
      }
      if (parsed.date) {
        const parts = parsed.date.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-indexed
          const day = parseInt(parts[2], 10);
          const newD = new Date(year, month, day);
          if (!isNaN(newD.getTime())) {
            setTxDate(newD);
          }
        }
      }
      if (parsed.type === "expense" || parsed.type === "income") {
        setTxType(parsed.type);
      } else {
        setTxType("expense");
      }

      setScanning(false);
      Alert.alert(t("success") + " 🎉", t("budgetScanSuccess"));
    } catch (err: any) {
      // Log full error details to console only — never expose to the user
      console.error("[OCR] Scan receipt error:", err);
      setScanning(false);
      if (err?.name === "AbortError") {
        Alert.alert(t("error"), t("budgetScanFailed"));
      } else {
        Alert.alert(t("error"), t("budgetScanFailed"));
      }
    }
  };

  // Edit Transaction form helper
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxTitle(tx.title);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxDate(new Date(tx.date));
    setTxRecurrence(tx.recurrence ?? "none");
    setSaveAsTemplate(false);
    setTransModalVisible(true);
  };

  // Close Transaction Modal helper
  const handleCloseTransModal = () => {
    setTxTitle("");
    setTxAmount("");
    setTxType("expense");
    setTxCategory("Food");
    setTxDate(new Date());
    setTxRecurrence("none");
    setSaveAsTemplate(false);
    setEditingTransaction(null);
    setTransModalVisible(false);
  };

  // Add / Update Transaction
  const handleSaveTransaction = async () => {
    if (!userProfile?.groupId || !currentUser) return;
    if (!txTitle.trim()) {
      Alert.alert(t("budgetTitleMissing"), t("budgetPleaseTitle"));
      return;
    }
    const amountFloat = parseFloat(txAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      Alert.alert(t("budgetAmountInvalid"), t("budgetPleaseAmount"));
      return;
    }

    try {
      const txData = {
        title: txTitle.trim(),
        amount: amountFloat,
        type: txType,
        category: txType === "income" ? "Income" : txCategory,
        date: txDate.toISOString().split("T")[0],
      };

      if (editingTransaction) {
        await updateDoc(doc(db, "transactions", editingTransaction.id), {
          ...txData,
          recurrence: txRecurrence,
          nextTriggerDate: txRecurrence === "monthly" ? txData.date : null
        });
        Alert.alert(t("success") + " 🎉", t("budgetTxUpdated"));
      } else {
        // 1. Save normal transaction log
        await addDoc(collection(db, "transactions"), {
          ...txData,
          groupId: userProfile.groupId,
          paidBy: currentUser.uid,
          createdAt: new Date().toISOString(),
          recurrence: txRecurrence,
          nextTriggerDate: txRecurrence === "monthly" ? txData.date : null,
          isTemplate: false
        });

        // 2. Save as Hotkey Template if selected
        if (saveAsTemplate) {
          await addDoc(collection(db, "transactions"), {
            title: txTitle.trim(),
            amount: amountFloat,
            type: txType,
            category: txType === "income" ? "Income" : txCategory,
            groupId: userProfile.groupId,
            paidBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            isTemplate: true
          });
        }

        Alert.alert(t("success") + " 🎉", t("budgetTxLogged"));
      }

      handleCloseTransModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("budgetFailedSave"), msg);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      t("deleteTransTitle"),
      `${t("deleteTransConfirm")} "${tx.title}" (${activeCurrency}${tx.amount.toFixed(2)})?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "transactions", tx.id));
              handleCloseTransModal();
              Alert.alert(t("budgetTxDeleted"), "");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("budgetFailedDelete"), msg);
            }
          }
        }
      ]
    );
  };

  // Update Allowance
  const handleUpdateAllowance = async () => {
    if (!userProfile?.groupId) return;
    const val = parseFloat(newAllowance);
    if (isNaN(val) || val < 0) {
      Alert.alert(t("budgetAmountInvalid"), t("budgetAllowanceInvalid"));
      return;
    }

    try {
      await updateDoc(doc(db, "groups", userProfile.groupId), {
        budgetBalance: val
      });
      setAllowanceModalVisible(false);
      setNewAllowance("");
      Alert.alert(t("budgetAllowanceUpdatedTitle"), t("budgetAllowanceUpdatedMsg"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("budgetFailedUpdate"), msg);
    }
  };

  // Helper to get category emojis
  const getCategoryEmoji = (category: string, type: "income" | "expense"): string => {
    if (type === "income") return "💰";
    switch (category) {
      case "Food": return "🍔";
      case "Groceries": return "🛒";
      case "Bills": return "🔌";
      case "Entertainment": return "🎬";
      case "Travel": return "✈️";
      case "Shopping": return "🛍️";
      case "Savings": return "🐷";
      default: return "📝";
    }
  };

  // Trigger quick preset
  const handleTriggerPreset = async (preset: Transaction) => {
    if (!userProfile?.groupId || !currentUser) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await addDoc(collection(db, "transactions"), {
        title: preset.title,
        amount: preset.amount,
        type: preset.type,
        category: preset.category,
        groupId: userProfile.groupId,
        paidBy: currentUser.uid,
        date: todayStr,
        createdAt: new Date().toISOString(),
        isTemplate: false
      });
      Alert.alert(
        lang === "zh" ? "记账成功! 🚀" : "Logged successfully! 🚀",
        lang === "zh"
          ? `已成功记录 "${preset.title}" (${activeCurrency}${preset.amount.toFixed(2)})！`
          : `Successfully logged "${preset.title}" (${activeCurrency}${preset.amount.toFixed(2)}) for today!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("budgetFailedSave"), msg);
    }
  };

  // Delete preset hotkey
  const handleDeletePreset = (preset: Transaction) => {
    Alert.alert(
      lang === "zh" ? "删除快捷键" : "Delete Preset",
      lang === "zh" 
        ? `您确定要删除快捷键 "${preset.title}" 吗？`
        : `Are you sure you want to delete the preset "${preset.title}"?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "transactions", preset.id));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("error"), msg);
            }
          }
        }
      ]
    );
  };

  // Open Add/Edit Savings Goal Modal helper
  const handleOpenAddGoalModal = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setNewGoalTitle(goal.title);
      setNewGoalTargetAmount(goal.targetAmount.toString());
      setNewGoalCurrentAmount(goal.currentAmount.toString());
      setNewGoalTargetDate(goal.targetDate ? new Date(goal.targetDate) : null);
    } else {
      setEditingGoal(null);
      setNewGoalTitle("");
      setNewGoalTargetAmount("");
      setNewGoalCurrentAmount("0");
      setNewGoalTargetDate(null);
    }
    setSavingsGoalModalVisible(true);
  };

  // Close Savings Goal Modal helper
  const handleCloseAddGoalModal = () => {
    setNewGoalTitle("");
    setNewGoalTargetAmount("");
    setNewGoalCurrentAmount("");
    setNewGoalTargetDate(null);
    setEditingGoal(null);
    setSavingsGoalModalVisible(false);
  };

  // Create or Update Savings Goal
  const handleSaveSavingsGoal = async () => {
    if (!userProfile?.groupId || !currentUser) return;
    if (!newGoalTitle.trim()) {
      Alert.alert(lang === "zh" ? "缺少标题" : "Title Missing", lang === "zh" ? "请输入储蓄目标标题。" : "Please enter a title for the savings goal.");
      return;
    }
    const targetFloat = parseFloat(newGoalTargetAmount);
    const currentFloat = parseFloat(newGoalCurrentAmount) || 0;
    if (isNaN(targetFloat) || targetFloat <= 0) {
      Alert.alert(t("budgetAmountInvalid"), lang === "zh" ? "请输入有效的目标金额。" : "Please enter a valid target amount.");
      return;
    }

    try {
      const goalData = {
        title: newGoalTitle.trim(),
        targetAmount: targetFloat,
        currentAmount: currentFloat,
        targetDate: newGoalTargetDate ? newGoalTargetDate.toISOString().split("T")[0] : null,
      };

      if (editingGoal) {
        await updateDoc(doc(db, "savings_goals", editingGoal.id), goalData);
        Alert.alert(t("success") + " 🎉", lang === "zh" ? "储蓄目标已更新！" : "Savings goal updated!");
      } else {
        await addDoc(collection(db, "savings_goals"), {
          ...goalData,
          groupId: userProfile.groupId,
          createdAt: new Date().toISOString()
        });
        Alert.alert(t("success") + " 🎉", lang === "zh" ? "储蓄目标已成功创建！" : "Savings goal created successfully!");
      }

      handleCloseAddGoalModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("error"), msg);
    }
  };

  // Delete Savings Goal
  const handleDeleteSavingsGoal = (goal: SavingsGoal) => {
    Alert.alert(
      lang === "zh" ? "删除储蓄目标" : "Delete Savings Goal",
      lang === "zh" 
        ? `您确定要删除储蓄目标 "${goal.title}" 吗？`
        : `Are you sure you want to delete the savings goal "${goal.title}"?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: lang === "zh" ? "删除" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "savings_goals", goal.id));
              handleCloseAddGoalModal();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert(t("error"), msg);
            }
          }
        }
      ]
    );
  };

  // Save Funds (Deposit / Withdraw from Savings Goal)
  const handleSaveGoalFunds = async () => {
    if (!selectedGoalForFunds || !userProfile?.groupId || !currentUser) return;
    const amountFloat = parseFloat(fundsAmount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      Alert.alert(t("budgetAmountInvalid"), lang === "zh" ? "请输入有效的金额。" : "Please enter a valid amount.");
      return;
    }

    try {
      const batch = writeBatch(db);
      const goalRef = doc(db, "savings_goals", selectedGoalForFunds.id);
      
      const newCurrentAmount = fundsAction === "add" 
        ? selectedGoalForFunds.currentAmount + amountFloat
        : Math.max(0, selectedGoalForFunds.currentAmount - amountFloat);

      // 1. Update savings goal amount
      batch.update(goalRef, {
        currentAmount: newCurrentAmount
      });

      // 2. Log transaction in ledger to adjust balance automatically!
      const txRef = doc(collection(db, "transactions"));
      batch.set(txRef, {
        groupId: userProfile.groupId,
        title: fundsAction === "add"
          ? `${lang === "zh" ? "存入储蓄：" : "Savings deposit: "}${selectedGoalForFunds.title}`
          : `${lang === "zh" ? "提取储蓄：" : "Savings withdrawal: "}${selectedGoalForFunds.title}`,
        amount: amountFloat,
        type: fundsAction === "add" ? "expense" : "income", // adding funds is a spending of the daily budget; withdrawing is an income to the daily budget!
        category: "Savings",
        paidBy: currentUser.uid,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        isTemplate: false
      });

      await batch.commit();

      const alertTitle = lang === "zh" ? "交易成功！ 🚀" : "Transaction Successful! 🚀";
      const alertMsg = fundsAction === "add"
        ? (lang === "zh" 
            ? `已成功将 ${activeCurrency}${amountFloat.toFixed(2)} 存入 "${selectedGoalForFunds.title}"，并在账单中记为一笔储蓄支出！` 
            : `Successfully deposited ${activeCurrency}${amountFloat.toFixed(2)} into "${selectedGoalForFunds.title}", and logged it as a savings expense!`)
        : (lang === "zh" 
            ? `已成功从 "${selectedGoalForFunds.title}" 提取 ${activeCurrency}${amountFloat.toFixed(2)}，并在账单中记为一笔储蓄收入！` 
            : `Successfully withdrew ${activeCurrency}${amountFloat.toFixed(2)} from "${selectedGoalForFunds.title}", and logged it as a savings income!`);
      
      Alert.alert(alertTitle, alertMsg);
      
      setFundsModalVisible(false);
      setSelectedGoalForFunds(null);
      setFundsAmount("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert(t("error"), msg);
    }
  };

  // Filter transactions
  const selectedYearMonth = `${customFilterDate.getFullYear()}-${(customFilterDate.getMonth() + 1).toString().padStart(2, "0")}`;
  const selectedDay = customFilterDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const selectedYear = `${customFilterDate.getFullYear()}`;

  const filteredTransactions = transactions.filter((t) => {
    if (budgetFilter === "daily") {
      return t.date === selectedDay;
    }
    if (budgetFilter === "monthly") {
      return t.date.startsWith(selectedYearMonth);
    }
    if (budgetFilter === "yearly") {
      return t.date.startsWith(selectedYear);
    }
    return true;
  });

  // Calculate stats
  const startingAllowance = group?.budgetBalance ?? 1000;
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncomes = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingBalance = startingAllowance - totalExpenses + totalIncomes;

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF5E7E" />
      </SafeAreaView>
    );
  }

  // Label helpers based on selected filter (localized)
  const filterLabel =
    budgetFilter === "daily"
      ? `${lang === "zh" ? "日：" : "Day: "}${customFilterDate.toLocaleDateString(lang === "zh" ? "zh-CN" : undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
      : budgetFilter === "monthly"
      ? `${lang === "zh" ? "月：" : "Month: "}${customFilterDate.toLocaleDateString(lang === "zh" ? "zh-CN" : undefined, { year: 'numeric', month: 'long' })}`
      : budgetFilter === "yearly"
      ? `${lang === "zh" ? "年：" : "Year: "}${customFilterDate.getFullYear()}`
      : lang === "zh" ? "全部" : "All Time";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t("budgetTitle")}</Text>
            <Text style={[styles.subtitle, { color: colors.subtitle }]}>{t("budgetSubtitle")}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.balanceLabel, { color: colors.subtitle }]}>{t("budgetRemainingPool")} ({filterLabel})</Text>
          <Text style={[styles.balanceValue, remainingBalance < 0 && { color: "#FF3B30" }]}>
            {activeCurrency}{remainingBalance.toFixed(2)}
          </Text>
          <View style={[styles.allowanceRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.allowanceText, { color: colors.subtitle }]}>{t("budgetStartingAllowance")}{activeCurrency}{startingAllowance.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.editAllowanceBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: colors.border }]}
              onPress={() => {
                setNewAllowance(startingAllowance.toString());
                setAllowanceModalVisible(true);
              }}
            >
              <Text style={[styles.editAllowanceBtnText, { color: colors.subtitle }]}>{t("budgetEditBtn")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Column */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderLeftColor: "#34C759", backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>{t("budgetIncomes")} ({filterLabel})</Text>
            <Text style={styles.statValueIncome}>+{activeCurrency}{totalIncomes.toFixed(2)}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: "#FF5E7E", backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subtitle }]}>{t("budgetExpenses")} ({filterLabel})</Text>
            <Text style={styles.statValueExpense}>-{activeCurrency}{totalExpenses.toFixed(2)}</Text>
          </View>
        </View>

        {/* Quick Presets / Hotkeys */}
        {presets.length > 0 && (
          <View style={styles.presetsContainer}>
            <Text style={[styles.presetsTitle, { color: colors.text }]}>
              {lang === "zh" ? "⚡ 快捷记账 (点击直接记录为今日)" : "⚡ Quick Presets (Tap to log for today)"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleTriggerPreset(preset)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetContent}>
                    <Text style={styles.presetEmoji}>
                      {getCategoryEmoji(preset.category, preset.type)}
                    </Text>
                    <View style={styles.presetInfo}>
                      <Text style={[styles.presetName, { color: colors.text }]} numberOfLines={1}>
                        {preset.title}
                      </Text>
                      <Text style={preset.type === "income" ? styles.presetAmountIncome : styles.presetAmountExpense} numberOfLines={1}>
                        {preset.type === "income" ? "+" : "-"}{activeCurrency}{preset.amount.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deletePresetBtn}
                      onPress={() => handleDeletePreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deletePresetBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Savings Goals Section */}
        <View style={styles.savingsSection}>
          <View style={styles.savingsHeader}>
            <Text style={[styles.presetsTitle, { color: colors.text, marginBottom: 0 }]}>
              {lang === "zh" ? "🐷 储蓄目标 (Savings Goals)" : "🐷 Savings Goals"}
            </Text>
            <TouchableOpacity onPress={() => handleOpenAddGoalModal()}>
              <Text style={{ color: "#FF5E7E", fontSize: 13, fontWeight: "700" }}>
                {lang === "zh" ? "+ 新建目标" : "+ New Goal"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
            {/* Savings Goal Cards */}
            {savingsGoals.map((goal) => {
              const progressPercent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const daysLeft = goal.targetDate ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : null;

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleOpenAddGoalModal(goal)}
                  activeOpacity={0.8}
                >
                  <View style={styles.goalCardTop}>
                    <Text style={styles.goalEmoji}>🐷</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Text style={[styles.goalTargetText, { color: colors.subtitle }]}>
                        {lang === "zh" ? "目标金额：" : "Target: "}{activeCurrency}{goal.targetAmount.toFixed(0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalProgressRow}>
                    <Text style={[styles.goalSavedText, { color: colors.text }]}>
                      {activeCurrency}{goal.currentAmount.toFixed(0)} ({progressPercent}%)
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.goalProgressBarBg}>
                    <View style={[styles.goalProgressBarFill, { width: `${progressPercent}%`, backgroundColor: progressPercent >= 100 ? "#34C759" : "#FF5E7E" }]} />
                  </View>

                  {/* Target Date Details */}
                  {goal.targetDate ? (
                    <Text style={styles.goalDateText}>
                      📅 {new Date(goal.targetDate).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")} ({daysLeft !== null && daysLeft > 0 ? (lang === "zh" ? `还剩 ${daysLeft} 天` : `${daysLeft} days left`) : (lang === "zh" ? "已到期" : "Due")})
                    </Text>
                  ) : (
                    <Text style={styles.goalDateText}>📅 {lang === "zh" ? "无截止日期" : "No deadline"}</Text>
                  )}

                  {/* Quick Fund Buttons */}
                  <View style={styles.goalActionButtons}>
                    <TouchableOpacity
                      style={[styles.goalFundBtn, { backgroundColor: "#FF5E7E" }]}
                      onPress={() => {
                        setSelectedGoalForFunds(goal);
                        setFundsAction("add");
                        setFundsAmount("");
                        setFundsModalVisible(true);
                      }}
                    >
                      <Text style={styles.goalFundBtnText}>{lang === "zh" ? "存钱" : "Save"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalFundBtn, { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => {
                        setSelectedGoalForFunds(goal);
                        setFundsAction("deduct");
                        setFundsAmount("");
                        setFundsModalVisible(true);
                      }}
                    >
                      <Text style={[styles.goalFundBtnText, { color: colors.text }]}>{lang === "zh" ? "取钱" : "Withdraw"}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Dotted Card for Creating Savings Goal */}
            <TouchableOpacity
              style={[styles.goalCard, { borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center" }]}
              onPress={() => handleOpenAddGoalModal()}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🐷</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#FF5E7E" }}>
                {lang === "zh" ? "+ 新建储蓄目标" : "+ New Savings Goal"}
              </Text>
              <Text style={{ fontSize: 11, color: colors.subtitle, textAlign: "center", marginTop: 4, paddingHorizontal: 12 }}>
                {lang === "zh" ? "自动平衡日常记账" : "Balance daily budgets"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ledger Headers */}
        <View style={styles.ledgerHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("budgetTransactionLog")}</Text>
          <TouchableOpacity style={styles.addTransBtn} onPress={() => setTransModalVisible(true)}>
            <Text style={styles.addTransText}>{t("budgetAddBillBtn")}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tab Selector */}
        <View style={[styles.filterTabContainer, { backgroundColor: colors.tabBackground, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.filterTabButton, budgetFilter === "all" && styles.filterTabButtonActive]}
            onPress={() => setBudgetFilter("all")}
          >
            <Text style={[styles.filterTabButtonText, budgetFilter === "all" && styles.filterTabButtonTextActive, { color: budgetFilter === "all" ? "#FFFFFF" : colors.inactiveText }]}>
              {t("budgetTabAll")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTabButton, budgetFilter === "daily" && styles.filterTabButtonActive]}
            onPress={() => setBudgetFilter("daily")}
          >
            <Text style={[styles.filterTabButtonText, budgetFilter === "daily" && styles.filterTabButtonTextActive, { color: budgetFilter === "daily" ? "#FFFFFF" : colors.inactiveText }]}>
              {t("budgetTabToday")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTabButton, budgetFilter === "monthly" && styles.filterTabButtonActive]}
            onPress={() => setBudgetFilter("monthly")}
          >
            <Text style={[styles.filterTabButtonText, budgetFilter === "monthly" && styles.filterTabButtonTextActive, { color: budgetFilter === "monthly" ? "#FFFFFF" : colors.inactiveText }]}>
              {t("budgetTabMonth")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTabButton, budgetFilter === "yearly" && styles.filterTabButtonActive]}
            onPress={() => setBudgetFilter("yearly")}
          >
            <Text style={[styles.filterTabButtonText, budgetFilter === "yearly" && styles.filterTabButtonTextActive, { color: budgetFilter === "yearly" ? "#FFFFFF" : colors.inactiveText }]}>
              {t("budgetTabYear")}
            </Text>
          </TouchableOpacity>
        </View>

        {budgetFilter !== "all" && (
          <TouchableOpacity
            style={[styles.customFilterTrigger, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowFilterDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.customFilterTriggerText, { color: colors.text }]}>
              {t("budgetReferencePeriod")}<Text style={{ color: "#FF5E7E", fontWeight: "700" }}>{filterLabel}</Text> ✏️
            </Text>
          </TouchableOpacity>
        )}

        {showFilterDatePicker && Platform.OS === "ios" ? (
          <Modal visible={showFilterDatePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text, textAlign: "center" }]}>{lang === "zh" ? "选择参考日期" : "Select Reference Date"}</Text>
                <DateTimePicker
                  value={customFilterDate}
                  mode="date"
                  display="spinner"
                  themeVariant={isDark ? "dark" : "light"}
                  textColor={colors.text}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setCustomFilterDate(selectedDate);
                    }
                  }}
                />
                <TouchableOpacity
                  style={[styles.modalSubmit, { marginTop: 16, alignItems: "center" }]}
                  onPress={() => setShowFilterDatePicker(false)}
                >
                  <Text style={styles.modalSubmitText}>{lang === "zh" ? "确认" : "Confirm"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : showFilterDatePicker ? (
          <DateTimePicker
            value={customFilterDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowFilterDatePicker(false);
              if (selectedDate) {
                setCustomFilterDate(selectedDate);
              }
            }}
          />
        ) : null}

        {/* Ledger Log */}
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>{t("budgetNoTransactionsTitle")}</Text>
            <Text style={[styles.emptySubText, { color: colors.subtitle }]}>{t("budgetNoTransactionsSub")}</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleEditTransaction(item)}
                onLongPress={() => handleDeleteTransaction(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.txIconBox, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
                  <Text style={styles.txIcon}>
                    {item.type === "income"
                      ? "💰"
                      : getCategoryLabel(item.category).split(" ")[1] ?? "❓"}
                  </Text>
                </View>
                <View style={styles.txMain}>
                  <Text style={[styles.txTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.txMeta, { color: colors.subtitle }]}>
                    {getCategoryLabel(item.category)} · {item.paidBy === currentUser?.uid ? (lang === "zh" ? "你" : "You") : (lang === "zh" ? "伴侣" : "Partner")} · {new Date(item.date).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    item.type === "income" ? styles.txIncomeText : { color: colors.text }
                  ]}
                >
                  {item.type === "income" ? "+" : "-"}{activeCurrency}{item.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.longPressHint, { color: colors.inactiveText }]}>{t("budgetHint")}</Text>
          </View>
        )}

      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={transModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: "85%" }]}>
            {scanning && (
              <View style={[styles.scanningOverlay, { backgroundColor: isDark ? "rgba(10,11,16,0.85)" : "rgba(248,249,250,0.85)" }]}>
                <ActivityIndicator size="large" color="#FF5E7E" />
                <Text style={[styles.scanningText, { color: colors.text }]}>{t("budgetScanning")}</Text>
              </View>
            )}
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0, flex: 1 }]}>
                  {editingTransaction ? t("budgetEditTransaction") : t("budgetLogSpending")}
                </Text>
                {!editingTransaction && (
                  <TouchableOpacity
                    style={styles.scanReceiptBtn}
                    onPress={handleScanReceipt}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.scanReceiptBtnText}>{t("budgetScanReceipt")}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetDescription")}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder={t("budgetPlaceholderDescription")}
                placeholderTextColor={colors.placeholderText}
                value={txTitle}
                onChangeText={setTxTitle}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetAmount")} ({activeCurrency})</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.placeholderText}
                value={txAmount}
                onChangeText={setTxAmount}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetType")}</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                    txType === "expense" && styles.typeBtnActiveExpense
                  ]}
                  onPress={() => setTxType("expense")}
                >
                  <Text style={[styles.typeBtnText, txType === "expense" && styles.typeBtnTextActive]}>
                    {t("budgetTypeExpense")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                    txType === "income" && styles.typeBtnActiveIncome
                  ]}
                  onPress={() => setTxType("income")}
                >
                  <Text style={[styles.typeBtnText, txType === "income" && styles.typeBtnTextActive]}>
                    {t("budgetTypeIncome")}
                  </Text>
                </TouchableOpacity>
              </View>

              {txType === "expense" && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetCategory")}</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.filter((c) => c.value !== "Income").map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.catBtn,
                          { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: colors.border },
                          txCategory === cat.value && styles.catBtnActive
                        ]}
                        onPress={() => setTxCategory(cat.value)}
                      >
                        <Text
                          style={[
                            styles.catBtnText,
                            { color: colors.subtitle },
                            txCategory === cat.value && styles.catBtnTextActive
                          ]}
                        >
                          {getCategoryLabel(cat.value)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetDate")}</Text>
              <TouchableOpacity
                style={[styles.datePickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowTxDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePickerTriggerText, { color: colors.text }]}>
                  📅 {txDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </Text>
              </TouchableOpacity>

              {showTxDatePicker && Platform.OS === "ios" ? (
                <Modal visible={showTxDatePicker} transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.modalTitle, { color: colors.text, textAlign: "center" }]}>{lang === "zh" ? "选择日期" : "Select Date"}</Text>
                      <DateTimePicker
                        value={txDate}
                        mode="date"
                        display="spinner"
                        themeVariant={isDark ? "dark" : "light"}
                        textColor={colors.text}
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setTxDate(selectedDate);
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.modalSubmit, { marginTop: 16, alignItems: "center" }]}
                        onPress={() => setShowTxDatePicker(false)}
                      >
                        <Text style={styles.modalSubmitText}>{lang === "zh" ? "确认" : "Confirm"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : showTxDatePicker ? (
                <DateTimePicker
                  value={txDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowTxDatePicker(false);
                    if (selectedDate) {
                      setTxDate(selectedDate);
                    }
                  }}
                />
              ) : null}
              {/* Hotkey and Recurrence Options */}
              <View style={styles.toggleSection}>
                {!editingTransaction && (
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>
                        {lang === "zh" ? "⚡ 保存为快捷记账 (Hotkey)" : "⚡ Save as Quick Preset (Hotkey)"}
                      </Text>
                      <Text style={[styles.toggleSub, { color: colors.subtitle }]}>
                        {lang === "zh" ? "在顶部显示快捷图标，点击可直接记账" : "Adds a quick-tap button at the top of the screen"}
                      </Text>
                    </View>
                    <Switch
                      value={saveAsTemplate}
                      onValueChange={setSaveAsTemplate}
                      trackColor={{ false: "#767577", true: "#FF5E7E" }}
                      thumbColor={saveAsTemplate ? "#FFFFFF" : "#f4f3f4"}
                    />
                  </View>
                )}

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>
                      {lang === "zh" ? "🔁 每月固定自动记账" : "🔁 Set as Monthly Recurring"}
                    </Text>
                    <Text style={[styles.toggleSub, { color: colors.subtitle }]}>
                      {lang === "zh" ? "每月自动扣除或存入相同金额" : "Automatically log this transaction every month"}
                    </Text>
                  </View>
                  <Switch
                    value={txRecurrence === "monthly"}
                    onValueChange={(val) => setTxRecurrence(val ? "monthly" : "none")}
                    trackColor={{ false: "#767577", true: "#FF5E7E" }}
                    thumbColor={txRecurrence === "monthly" ? "#FFFFFF" : "#f4f3f4"}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                {editingTransaction && (
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, { marginRight: "auto" }]}
                    onPress={() => handleDeleteTransaction(editingTransaction)}
                  >
                    <Text style={styles.modalDeleteText}>{lang === "zh" ? "删除 🗑️" : "Delete 🗑️"}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={handleCloseTransModal}
                >
                  <Text style={styles.modalCancelText}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveTransaction}>
                  <Text style={styles.modalSubmitText}>{editingTransaction ? (lang === "zh" ? "更新" : "Update") : (lang === "zh" ? "保存" : "Save")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Allowance Modal */}
      <Modal visible={allowanceModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("budgetSetAllowanceTitle")}</Text>
            <Text style={[styles.allowanceHint, { color: colors.subtitle }]}>
              {t("budgetSetAllowanceSub")}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>{t("budgetAllowanceAmount")} ({activeCurrency})</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder={t("budgetPlaceholderAllowance")}
              placeholderTextColor={colors.placeholderText}
              value={newAllowance}
              onChangeText={setNewAllowance}
              keyboardType="number-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewAllowance("");
                  setAllowanceModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleUpdateAllowance}>
                <Text style={styles.modalSubmitText}>{lang === "zh" ? "保存" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create / Edit Savings Goal Modal */}
      <Modal visible={savingsGoalModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: "85%" }]}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingGoal ? (lang === "zh" ? "编辑储蓄目标 🐷" : "Edit Savings Goal 🐷") : (lang === "zh" ? "新建储蓄目标 🐷" : "New Savings Goal 🐷")}
              </Text>

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                {lang === "zh" ? "目标名称 (如：日本旅行、买新车)" : "Goal Name (e.g. Japan Trip)"}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder={lang === "zh" ? "给储蓄目标起个名字..." : "Name your goal..."}
                placeholderTextColor={colors.placeholderText}
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                {lang === "zh" ? "目标金额" : "Target Amount"} ({activeCurrency})
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.placeholderText}
                value={newGoalTargetAmount}
                onChangeText={setNewGoalTargetAmount}
                keyboardType="decimal-pad"
              />

              {!editingGoal && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                    {lang === "zh" ? "初始存入金额 (可选)" : "Initial Amount Saved (Optional)"} ({activeCurrency})
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    value={newGoalCurrentAmount}
                    onChangeText={setNewGoalCurrentAmount}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
                {lang === "zh" ? "目标截止日期 (可选)" : "Target Date (Optional)"}
              </Text>
              <TouchableOpacity
                style={[styles.datePickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowGoalDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePickerTriggerText, { color: colors.text }]}>
                  📅 {newGoalTargetDate ? newGoalTargetDate.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : (lang === "zh" ? "选择目标日期" : "Select Target Date")}
                </Text>
              </TouchableOpacity>

              {showGoalDatePicker && Platform.OS === "ios" ? (
                <Modal visible={showGoalDatePicker} transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.modalTitle, { color: colors.text, textAlign: "center" }]}>{lang === "zh" ? "选择目标日期" : "Select Target Date"}</Text>
                      <DateTimePicker
                        value={newGoalTargetDate || new Date()}
                        mode="date"
                        display="spinner"
                        themeVariant={isDark ? "dark" : "light"}
                        textColor={colors.text}
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setNewGoalTargetDate(selectedDate);
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.modalSubmit, { marginTop: 16, alignItems: "center" }]}
                        onPress={() => setShowGoalDatePicker(false)}
                      >
                        <Text style={styles.modalSubmitText}>{lang === "zh" ? "确认" : "Confirm"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : showGoalDatePicker ? (
                <DateTimePicker
                  value={newGoalTargetDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowGoalDatePicker(false);
                    if (selectedDate) {
                      setNewGoalTargetDate(selectedDate);
                    }
                  }}
                />
              ) : null}

              <View style={styles.modalButtons}>
                {editingGoal && (
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, { marginRight: "auto" }]}
                    onPress={() => handleDeleteSavingsGoal(editingGoal)}
                  >
                    <Text style={styles.modalDeleteText}>{lang === "zh" ? "删除 🗑️" : "Delete 🗑️"}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={handleCloseAddGoalModal}
                >
                  <Text style={styles.modalCancelText}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveSavingsGoal}>
                  <Text style={styles.modalSubmitText}>{editingGoal ? (lang === "zh" ? "更新" : "Update") : (lang === "zh" ? "创建" : "Create")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manage Savings Goal Funds Modal (Deposit / Withdraw) */}
      <Modal visible={fundsModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {fundsAction === "add" 
                ? (lang === "zh" ? "存入储蓄资金 🐷" : "Deposit Savings 🐷")
                : (lang === "zh" ? "提取储蓄资金 💸" : "Withdraw Savings 💸")}
            </Text>
            <Text style={[styles.allowanceHint, { color: colors.subtitle, marginBottom: 16 }]}>
              {fundsAction === "add" 
                ? (lang === "zh" 
                    ? `存入的资金将自动在共享账本中记为一笔“储蓄支出”，从您的日常支出池中扣除。` 
                    : `Depositing funds will log a "Savings" expense in your shared ledger, deducting it from your daily budget.`)
                : (lang === "zh" 
                    ? `提取的资金将自动在共享账本中记为一笔“储蓄收入”，退回到您的日常支出池中。` 
                    : `Withdrawing funds will log a "Savings" income in your shared ledger, returning it to your daily budget.`)}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.subtitle }]}>
              {lang === "zh" ? "请输入金额" : "Enter Amount"} ({activeCurrency})
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.placeholderText}
              value={fundsAmount}
              onChangeText={setFundsAmount}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setFundsModalVisible(false);
                  setSelectedGoalForFunds(null);
                  setFundsAmount("");
                }}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveGoalFunds}>
                <Text style={styles.modalSubmitText}>{lang === "zh" ? "确认" : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0B10",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#A0A5C0",
  },
  balanceCard: {
    backgroundColor: "#131520",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#A0A5C0",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceValue: {
    color: "#34C759",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 16,
  },
  allowanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
  },
  allowanceText: {
    color: "#606580",
    fontSize: 13,
    fontWeight: "600",
  },
  editAllowanceBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  editAllowanceBtnText: {
    color: "#A0A5C0",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#A0A5C0",
    fontWeight: "600",
    marginBottom: 4,
  },
  statValueIncome: {
    fontSize: 18,
    fontWeight: "800",
    color: "#34C759",
  },
  statValueExpense: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF5E7E",
  },
  ledgerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addTransBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addTransText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubText: {
    color: "#606580",
    fontSize: 13,
    textAlign: "center",
  },
  transactionsList: {
    gap: 12,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131520",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIcon: {
    fontSize: 18,
  },
  txMain: {
    flex: 1,
    paddingRight: 8,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  txMeta: {
    fontSize: 11,
    color: "#606580",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txIncomeText: {
    color: "#34C759",
  },
  txExpenseText: {
    color: "#FFFFFF",
  },
  longPressHint: {
    fontSize: 11,
    color: "#606580",
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#131520",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalScroll: {
    paddingVertical: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scanReceiptBtn: {
    backgroundColor: "rgba(255, 94, 126, 0.15)",
    borderWidth: 1,
    borderColor: "#FF5E7E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scanReceiptBtnText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  scanningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  scanningText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  allowanceHint: {
    fontSize: 13,
    color: "#A0A5C0",
    lineHeight: 18,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A0A5C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    height: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  typeBtnActiveExpense: {
    backgroundColor: "rgba(255,94,126,0.12)",
    borderColor: "rgba(255,94,126,0.25)",
  },
  typeBtnActiveIncome: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderColor: "rgba(52,199,89,0.25)",
  },
  typeBtnText: {
    color: "#606580",
    fontSize: 13,
    fontWeight: "700",
  },
  typeBtnTextActive: {
    color: "#FFFFFF",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  catBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  catBtnActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  catBtnText: {
    color: "#A0A5C0",
    fontSize: 12,
    fontWeight: "600",
  },
  catBtnTextActive: {
    color: "#FFFFFF",
  },
  datePickerTrigger: {
    height: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  datePickerTriggerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSubmit: {
    backgroundColor: "#FF5E7E",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalDeleteText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
  filterTabContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  filterTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  filterTabButtonActive: {
    backgroundColor: "#FF5E7E",
  },
  filterTabButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterTabButtonTextActive: {
    color: "#FFFFFF",
  },
  customFilterTrigger: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  customFilterTriggerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  presetsContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  presetsTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  presetsScroll: {
    paddingRight: 20,
  },
  presetCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    minWidth: 145,
  },
  presetContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  presetEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  presetInfo: {
    flex: 1,
    marginRight: 8,
  },
  presetName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  presetAmountIncome: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34C759",
  },
  presetAmountExpense: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5E7E",
  },
  deletePresetBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,59,48,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  deletePresetBtnText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
  toggleSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 11,
  },
  savingsSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  savingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginRight: 12,
    width: 220,
    minHeight: 180,
  },
  goalCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  goalTargetText: {
    fontSize: 11,
  },
  goalProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  goalSavedText: {
    fontSize: 13,
    fontWeight: "700",
  },
  goalProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
    marginBottom: 10,
    overflow: "hidden",
  },
  goalProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalDateText: {
    fontSize: 10,
    color: "#8085A0",
    marginBottom: 12,
  },
  goalActionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  goalFundBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  goalFundBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
