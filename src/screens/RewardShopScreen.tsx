import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  runTransaction,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { Reward, UserProfile, GroupProfile, PurchasedCoupon } from "../types";

export default function RewardShopScreen() {
  const currentUser = auth.currentUser;

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myCoupons, setMyCoupons] = useState<PurchasedCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  // Active tab: "shop" | "inbox"
  const [activeTab, setActiveTab] = useState<"shop" | "inbox">("shop");

  // Create reward modal
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("100");

  // Load user profile
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      setUserProfile(snap.data() as UserProfile ?? null);
    });
    return unsub;
  }, [currentUser]);

  // Load group, rewards, and purchased coupons
  useEffect(() => {
    if (!userProfile?.groupId || !currentUser) return;

    const unsubGroup = onSnapshot(doc(db, "groups", userProfile.groupId), (snap) => {
      setGroup(snap.data() as GroupProfile ?? null);
    });

    const rewardsQ = query(
      collection(db, "rewards"),
      where("groupId", "==", userProfile.groupId),
      where("status", "==", "active")
    );
    const unsubRewards = onSnapshot(rewardsQ, (snap) => {
      setRewards(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reward)));
    });

    // My purchased coupons inbox
    const couponsQ = query(
      collection(db, "purchased_coupons"),
      where("groupId", "==", userProfile.groupId),
      where("buyerId", "==", currentUser.uid)
    );
    const unsubCoupons = onSnapshot(couponsQ, (snap) => {
      const loaded = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as PurchasedCoupon))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setMyCoupons(loaded);
    });

    return () => {
      unsubGroup();
      unsubRewards();
      unsubCoupons();
    };
  }, [userProfile?.groupId, currentUser]);

  const handleCreateReward = async () => {
    if (!newRewardTitle.trim() || !newRewardDesc.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    // Enforce minimum cost of 1 point
    const cost = Math.max(1, parseInt(newRewardCost, 10) || 100);

    try {
      await addDoc(collection(db, "rewards"), {
        groupId: userProfile?.groupId,
        title: newRewardTitle.trim(),
        description: newRewardDesc.trim(),
        pointsCost: cost,
        createdBy: currentUser?.uid,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      setNewRewardTitle("");
      setNewRewardDesc("");
      setNewRewardCost("100");
      setRewardModalVisible(false);
      Alert.alert("Coupon Created! 🎁", "Your partner can now spend points to purchase it!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Failed to Create Coupon", msg);
    }
  };

  const handleBuyReward = (reward: Reward) => {
    if (!currentUser || !group) return;

    const myPoints = group.balances[currentUser.uid] ?? 0;

    // Pre-flight check for better UX
    if (myPoints < reward.pointsCost) {
      Alert.alert(
        "Not Enough Points 😔",
        `You need ${reward.pointsCost} pts but only have ${myPoints} pts. Complete more chores!`
      );
      return;
    }

    // Confirmation dialog before spending points
    Alert.alert(
      "Redeem Coupon?",
      `Spend ${reward.pointsCost} pts to redeem:\n"${reward.title}"\n\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Spend ${reward.pointsCost} pts`,
          style: "destructive",
          onPress: () => executePurchase(reward),
        },
      ]
    );
  };

  const executePurchase = async (reward: Reward) => {
    if (!currentUser || !userProfile?.groupId) return;

    setLoading(true);
    try {
      const groupRef = doc(db, "groups", userProfile.groupId);

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupRef);
        if (!groupSnap.exists()) throw new Error("Group does not exist.");

        const groupData = groupSnap.data() as GroupProfile;
        const currentBalance = groupData.balances[currentUser.uid] ?? 0;

        // Server-side validation: Cannot buy your own reward
        if (reward.createdBy === currentUser.uid) {
          throw new Error("You cannot purchase your own coupon.");
        }

        // Server-side balance check
        if (currentBalance < reward.pointsCost) {
          throw new Error("Insufficient points.");
        }

        transaction.update(groupRef, {
          [`balances.${currentUser.uid}`]: currentBalance - reward.pointsCost,
        });

        const couponRef = doc(collection(db, "purchased_coupons"));
        transaction.set(couponRef, {
          groupId: userProfile.groupId!, // groupId is verified non-null by outer guard
          rewardId: reward.id,
          buyerId: currentUser.uid,
          title: reward.title,
          pointsSpent: reward.pointsCost,
          status: "active" as const,
          createdAt: new Date().toISOString(),
        });
      });

      Alert.alert(
        "Coupon Purchased! 🎉",
        `"${reward.title}" is now in your Coupon Inbox. Show it to your partner to redeem!`
      );
      setActiveTab("inbox");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      Alert.alert("Purchase Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCoupon = async (coupon: PurchasedCoupon) => {
    Alert.alert(
      "Mark as Redeemed?",
      `Mark "${coupon.title}" as redeemed? This confirms your partner honored the coupon.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Redeemed",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "purchased_coupons", coupon.id), {
                status: "redeemed",
                redeemedAt: new Date().toISOString(),
              });
              Alert.alert("Coupon Redeemed! ✅", "Glad you enjoyed it! 💕");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  const buyableRewards = rewards.filter((r) => r.createdBy !== currentUser?.uid);
  const myCreatedRewards = rewards.filter((r) => r.createdBy === currentUser?.uid);
  const myPoints = currentUser && group ? group.balances[currentUser.uid] ?? 0 : 0;
  const activeCoupons = myCoupons.filter((c) => c.status === "active");
  const redeemedCoupons = myCoupons.filter((c) => c.status === "redeemed");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reward Shop</Text>
          <Text style={styles.subtitle}>Earn points for chores, spend them on relationship coupons!</Text>
        </View>

        {/* Points Balance */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Your Balance</Text>
          <Text style={styles.pointsValue}>🪙 {myPoints.toLocaleString()} pts</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "shop" && styles.tabActive]}
            onPress={() => setActiveTab("shop")}
          >
            <Text style={[styles.tabText, activeTab === "shop" && styles.tabTextActive]}>
              🛍 Shop
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "inbox" && styles.tabActive]}
            onPress={() => setActiveTab("inbox")}
          >
            <Text style={[styles.tabText, activeTab === "inbox" && styles.tabTextActive]}>
              🎟 My Coupons {activeCoupons.length > 0 ? `(${activeCoupons.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "shop" ? (
          <>
            {/* Buyable coupons */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available to Buy</Text>
            </View>

            {buyableRewards.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={styles.emptyText}>No coupons from partner yet.</Text>
                <Text style={styles.emptySub}>Ask them to create coupons for you to buy!</Text>
              </View>
            ) : (
              <View style={styles.rewardsList}>
                {buyableRewards.map((item) => {
                  const canAfford = myPoints >= item.pointsCost;
                  return (
                    <View key={item.id} style={styles.rewardCard}>
                      <View style={styles.rewardDetails}>
                        <Text style={styles.rewardTitle}>{item.title}</Text>
                        <Text style={styles.rewardDesc}>{item.description}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                        onPress={() => handleBuyReward(item)}
                        disabled={loading || !canAfford}
                      >
                        <Text style={styles.buyBtnText}>🪙 {item.pointsCost}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* My created coupons */}
            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
              <Text style={styles.sectionTitle}>Coupons You Offer</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setRewardModalVisible(true)}>
                <Text style={styles.addBtnText}>+ Create</Text>
              </TouchableOpacity>
            </View>

            {myCreatedRewards.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyText}>You're not offering any coupons.</Text>
                <Text style={styles.emptySub}>Create a coupon for your partner to spend their points on!</Text>
              </View>
            ) : (
              <View style={styles.rewardsList}>
                {myCreatedRewards.map((item) => (
                  <View key={item.id} style={[styles.rewardCard, styles.myCreatedCard]}>
                    <View style={styles.rewardDetails}>
                      <Text style={styles.rewardTitle}>{item.title}</Text>
                      <Text style={styles.rewardDesc}>{item.description}</Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Text style={styles.costBadgeText}>🪙 {item.pointsCost}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* My Coupons Inbox — previously missing entirely */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Coupons</Text>
            </View>

            {activeCoupons.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🎟</Text>
                <Text style={styles.emptyText}>No active coupons.</Text>
                <Text style={styles.emptySub}>Purchase coupons from the Shop tab to see them here!</Text>
              </View>
            ) : (
              <View style={styles.rewardsList}>
                {activeCoupons.map((item) => (
                  <View key={item.id} style={styles.couponCard}>
                    <View style={styles.couponLeft}>
                      <Text style={styles.couponTitle}>{item.title}</Text>
                      <Text style={styles.couponMeta}>Purchased for 🪙 {item.pointsSpent} pts</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.redeemBtn}
                      onPress={() => handleRedeemCoupon(item)}
                    >
                      <Text style={styles.redeemBtnText}>Redeem</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {redeemedCoupons.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                  <Text style={[styles.sectionTitle, { color: "#606580" }]}>Redeemed History</Text>
                </View>
                <View style={styles.rewardsList}>
                  {redeemedCoupons.map((item) => (
                    <View key={item.id} style={[styles.couponCard, styles.couponRedeemed]}>
                      <View style={styles.couponLeft}>
                        <Text style={[styles.couponTitle, { color: "#606580" }]}>{item.title}</Text>
                        <Text style={styles.couponMeta}>
                          Redeemed on {item.redeemedAt ? new Date(item.redeemedAt).toLocaleDateString() : "—"}
                        </Text>
                      </View>
                      <View style={styles.redeemedBadge}>
                        <Text style={styles.redeemedBadgeText}>✓ Done</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Coupon Modal */}
      <Modal visible={rewardModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create a Relationship Coupon</Text>

            <Text style={styles.modalLabel}>Coupon Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Free Massage, Cook Dinner..."
              placeholderTextColor="#606580"
              value={newRewardTitle}
              onChangeText={setNewRewardTitle}
              autoFocus
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              placeholder="Describe how to redeem this coupon..."
              placeholderTextColor="#606580"
              value={newRewardDesc}
              onChangeText={setNewRewardDesc}
              multiline
            />

            <Text style={styles.modalLabel}>Cost in Points (min. 1)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="100"
              placeholderTextColor="#606580"
              value={newRewardCost}
              onChangeText={setNewRewardCost}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewRewardTitle("");
                  setNewRewardDesc("");
                  setNewRewardCost("100");
                  setRewardModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateReward}>
                <Text style={styles.modalSubmitText}>Create Coupon</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF5E7E" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    color: "#A0A5C0",
    marginTop: 4,
    lineHeight: 18,
  },
  pointsCard: {
    backgroundColor: "#131520",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 94, 126, 0.12)",
    marginBottom: 20,
  },
  pointsLabel: {
    fontSize: 11,
    color: "#A0A5C0",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pointsValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FF5E7E",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabActive: {
    backgroundColor: "rgba(255, 94, 126, 0.12)",
    borderColor: "rgba(255, 94, 126, 0.3)",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#606580",
  },
  tabTextActive: {
    color: "#FF5E7E",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addBtn: {
    backgroundColor: "rgba(255,94,126,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.2)",
  },
  addBtnText: {
    color: "#FF5E7E",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#131520",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: "#A0A5C0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySub: {
    color: "#606580",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131520",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  myCreatedCard: {
    borderColor: "rgba(255,255,255,0.02)",
    backgroundColor: "rgba(19, 21, 32, 0.7)",
  },
  rewardDetails: {
    flex: 1,
    paddingRight: 14,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 12,
    color: "#A0A5C0",
    lineHeight: 17,
  },
  buyBtn: {
    backgroundColor: "#FF5E7E",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buyBtnDisabled: {
    backgroundColor: "rgba(255,94,126,0.3)",
  },
  buyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  costBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  costBadgeText: {
    color: "#A0A5C0",
    fontSize: 12,
    fontWeight: "600",
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131520",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,94,126,0.12)",
  },
  couponRedeemed: {
    borderColor: "rgba(255,255,255,0.04)",
    opacity: 0.6,
  },
  couponLeft: {
    flex: 1,
    paddingRight: 12,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  couponMeta: {
    fontSize: 11,
    color: "#606580",
    fontWeight: "600",
  },
  redeemBtn: {
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.3)",
  },
  redeemBtnText: {
    color: "#34C759",
    fontSize: 12,
    fontWeight: "700",
  },
  redeemedBadge: {
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  redeemedBadgeText: {
    color: "#606580",
    fontSize: 11,
    fontWeight: "700",
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 20,
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
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
    height: 50,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
