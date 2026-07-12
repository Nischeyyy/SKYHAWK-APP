import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, formatCurrency, hoursBetween } from "@/src/utils/format";
import { StatusPill } from "@/src/ui";
import { impact as hapticImpact, success as hapticSuccess } from "@/src/utils/haptics";

const STATUS_TONE: Record<string, "accent" | "warning" | "verified" | "danger" | "neutral"> = {
  open: "accent",
  accepted: "warning",
  approved: "verified",
  rejected: "danger",
  cancelled: "neutral",
};

export default function ShiftSwaps() {
  const router = useRouter();
  const [data, setData] = useState<{ own: any[]; marketplace: any[] }>({ own: [], marketplace: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "market">("mine");
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d: any = await api("/shift-swaps");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const volunteer = async (swapId: string) => {
    hapticImpact();
    setActing(swapId);
    try {
      await api(`/shift-swaps/${swapId}/volunteer`, { method: "POST" });
      hapticSuccess();
      showToast("Volunteered — awaiting manager approval.");
      await load();
    } catch (e: any) { showToast(e.message); }
    setActing(null);
  };

  const cancelSwap = (swapId: string) => {
    Alert.alert("Cancel Swap Request", "Remove this from the marketplace?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Request", style: "destructive",
        onPress: async () => {
          setActing(swapId);
          try {
            await api(`/shift-swaps/${swapId}/cancel`, { method: "POST" });
            showToast("Swap request cancelled");
            await load();
          } catch (e: any) { showToast(e.message); }
          setActing(null);
        },
      },
    ]);
  };

  const mySwaps = data.own;
  const marketSwaps = data.marketplace;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Shift Swaps</Text>
      </View>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segBtn, tab === "mine" && styles.segActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.segText, tab === "mine" && styles.segTextActive]}>
            My Requests · {mySwaps.length}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segBtn, tab === "market" && styles.segActive]}
          onPress={() => setTab("market")}
        >
          <Text style={[styles.segText, tab === "market" && styles.segTextActive]}>
            Marketplace · {marketSwaps.length}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* MY REQUESTS */}
          {tab === "mine" && (
            <>
              {mySwaps.length === 0 && (
                <View style={styles.emptyBlock}>
                  <Ionicons name="swap-horizontal-outline" size={44} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyText}>No swap requests yet</Text>
                  <Text style={styles.emptySub}>
                    From any scheduled shift, tap "Request Shift Swap" to post it here.
                  </Text>
                </View>
              )}
              {mySwaps.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.card, i < mySwaps.length - 1 && styles.cardBorder]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardDate}>{formatDate(s.start)}</Text>
                    <StatusPill label={s.status} tone={STATUS_TONE[s.status] ?? "neutral"} />
                  </View>
                  <Text style={styles.cardTime}>
                    {formatShiftTime(s.start)} – {formatShiftTime(s.end)}
                  </Text>
                  <Text style={styles.cardSite}>{s.site_name ?? "Unknown site"} · {s.role}</Text>
                  {s.reason ? (
                    <Text style={styles.cardReason}>Reason: "{s.reason}"</Text>
                  ) : null}
                  {s.volunteer_name && s.status === "accepted" && (
                    <View style={styles.volunteerRow}>
                      <Ionicons name="person-outline" size={13} color={theme.colors.accent} />
                      <Text style={styles.volunteerText}>
                        {s.volunteer_name} volunteered · awaiting manager approval
                      </Text>
                    </View>
                  )}
                  {s.status === "approved" && (
                    <View style={styles.volunteerRow}>
                      <Ionicons name="checkmark-circle" size={13} color={theme.colors.verified} />
                      <Text style={[styles.volunteerText, { color: theme.colors.verified }]}>
                        Transferred to {s.volunteer_name}
                      </Text>
                    </View>
                  )}
                  {(s.status === "open" || s.status === "accepted") && (
                    <Pressable
                      style={styles.cancelLink}
                      onPress={() => cancelSwap(s.id)}
                      disabled={acting === s.id}
                    >
                      <Text style={styles.cancelLinkText}>Cancel Request</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </>
          )}

          {/* MARKETPLACE */}
          {tab === "market" && (
            <>
              {marketSwaps.length === 0 && (
                <View style={styles.emptyBlock}>
                  <Ionicons name="calendar-outline" size={44} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyText}>No open swaps right now</Text>
                  <Text style={styles.emptySub}>
                    When colleagues post shift swaps, they appear here for you to pick up.
                  </Text>
                </View>
              )}
              {marketSwaps.map((s, i) => {
                const hrs = hoursBetween(s.start, s.end);
                return (
                  <View
                    key={s.id}
                    style={[styles.card, i < marketSwaps.length - 1 && styles.cardBorder]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardDate}>{formatDate(s.start)}</Text>
                      <Text style={styles.cardPay}>
                        {formatCurrency(s.pay_rate)}
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>/hr</Text>
                      </Text>
                    </View>
                    <Text style={styles.cardTime}>
                      {formatShiftTime(s.start)} – {formatShiftTime(s.end)}
                    </Text>
                    <Text style={styles.cardSite}>
                      {s.site_name ?? "Unknown site"} · {s.role} · {hrs}h
                    </Text>
                    <Text style={styles.postedBy}>Posted by {s.requester_name}</Text>
                    {s.reason ? (
                      <Text style={styles.cardReason}>"{s.reason}"</Text>
                    ) : null}
                    <Pressable
                      style={[styles.volunteerBtn, acting === s.id && { opacity: 0.6 }]}
                      onPress={() => volunteer(s.id)}
                      disabled={acting === s.id}
                    >
                      {acting === s.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="hand-right-outline" size={16} color="#fff" />
                          <Text style={styles.volunteerBtnText}>Volunteer to Cover</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  segmented: {
    flexDirection: "row", marginHorizontal: 20,
    backgroundColor: theme.colors.card, borderRadius: theme.radius.md,
    padding: 3, marginBottom: 16,
  },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: theme.radius.sm },
  segActive: { backgroundColor: theme.colors.cardElevated },
  segText: { color: theme.colors.textSecondary, fontSize: 13 },
  segTextActive: { color: theme.colors.text, fontWeight: "500" },
  card: { paddingVertical: 18 },
  cardBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  cardDate: {
    color: theme.colors.textSecondary, fontSize: 12,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  cardTime: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  cardPay: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  cardSite: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  cardReason: { color: theme.colors.textTertiary, fontSize: 13, fontStyle: "italic", marginTop: 6 },
  postedBy: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  volunteerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  volunteerText: { color: theme.colors.accent, fontSize: 13 },
  cancelLink: { marginTop: 10, alignSelf: "flex-start" },
  cancelLinkText: { color: theme.colors.danger, fontSize: 13 },
  volunteerBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 14,
  },
  volunteerBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  emptyBlock: { alignItems: "center", paddingVertical: 64, gap: 10 },
  emptyText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: "500" },
  emptySub: { color: theme.colors.textTertiary, fontSize: 14, textAlign: "center", maxWidth: 280 },
  toast: {
    position: "absolute", bottom: 30, left: 20, right: 20,
    backgroundColor: theme.colors.card, padding: 12,
    borderRadius: theme.radius.md, alignItems: "center",
  },
  toastText: { color: theme.colors.text, fontSize: 14 },
});
