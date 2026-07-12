import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatDate, formatShiftTime, formatCurrency, hoursBetween } from "@/src/utils/format";
import { StatusPill } from "@/src/ui";
import { impact as hapticImpact, success as hapticSuccess } from "@/src/utils/haptics";

const STATUS_TONE: Record<string, "accent" | "warning" | "verified" | "danger" | "neutral"> = {
  open: "accent",
  accepted: "warning",
  approved: "verified",
  rejected: "danger",
  cancelled: "neutral",
};

type SwapFilter = "accepted" | "all";

export default function AdminShiftSwaps() {
  const router = useRouter();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<SwapFilter>("accepted");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = filter === "all" ? "" : "?status=accepted";
      const d: any = await api(`/admin/shift-swaps${q}`);
      setSwaps(d.swaps ?? []);
    } catch {}
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const decide = (swapId: string, action: "approve" | "reject") => {
    const label = action === "approve" ? "Approve" : "Reject";
    const msg = action === "approve"
      ? "Approve this swap? The shift will be permanently transferred to the volunteer."
      : "Reject this swap? The requester keeps their original shift.";
    Alert.alert(`${label} Swap`, msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: action === "approve" ? "default" : "destructive",
        onPress: async () => {
          hapticImpact();
          setActing(swapId);
          try {
            await api(`/admin/shift-swaps/${swapId}/decision`, { method: "POST", body: { action } });
            hapticSuccess();
            showToast(action === "approve" ? "Swap approved and transferred." : "Swap rejected.");
            await load();
          } catch (e: any) {
            showToast(e.message ?? "Something went wrong.");
          }
          setActing(null);
        },
      },
    ]);
  };

  const pendingCount = swaps.filter(s => s.status === "accepted").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Shift Swaps</Text>
          {pendingCount > 0 && (
            <Text style={styles.subtitle}>{pendingCount} pending approval</Text>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {([["accepted", "Needs Approval"], ["all", "All Swaps"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterBtn, filter === key && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}
        >
          {swaps.length === 0 && (
            <View style={styles.emptyBlock}>
              <Ionicons name="swap-horizontal-outline" size={44} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>
                {filter === "accepted" ? "No swaps pending approval" : "No swap requests"}
              </Text>
            </View>
          )}

          {swaps.map((s) => {
            const hrs = hoursBetween(s.start, s.end);
            const needsAction = s.status === "accepted";
            return (
              <View key={s.id} style={[styles.card, needsAction && styles.cardHighlight]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardDate}>{formatDate(s.start)}</Text>
                    <Text style={styles.cardTime}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
                    <Text style={styles.cardMeta}>{s.role} · {hrs}h · {formatCurrency(s.pay_rate)}/hr</Text>
                  </View>
                  <StatusPill label={s.status} tone={STATUS_TONE[s.status] ?? "neutral"} />
                </View>

                <View style={styles.partyRow}>
                  <View style={styles.partyBox}>
                    <Text style={styles.partyLabel}>REQUESTER</Text>
                    <Text style={styles.partyName}>{s.requester_name}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                  <View style={styles.partyBox}>
                    <Text style={styles.partyLabel}>VOLUNTEER</Text>
                    <Text style={[styles.partyName, !s.volunteer_name && { color: theme.colors.textTertiary }]}>
                      {s.volunteer_name ?? "Awaiting…"}
                    </Text>
                  </View>
                </View>

                {s.reason ? (
                  <Text style={styles.reason}>"{s.reason}"</Text>
                ) : null}

                {needsAction && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.rejectBtn, acting === s.id && { opacity: 0.5 }]}
                      onPress={() => decide(s.id, "reject")}
                      disabled={acting === s.id}
                    >
                      {acting === s.id ? <ActivityIndicator color={theme.colors.danger} size="small" /> : (
                        <>
                          <Ionicons name="close" size={16} color={theme.colors.danger} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.approveBtn, acting === s.id && { opacity: 0.5 }]}
                      onPress={() => decide(s.id, "approve")}
                      disabled={acting === s.id}
                    >
                      {acting === s.id ? <ActivityIndicator color="#fff" size="small" /> : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}

                {s.status === "approved" && (
                  <View style={styles.resolvedRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={[styles.resolvedText, { color: "#22C55E" }]}>
                      Transferred to {s.volunteer_name}
                    </Text>
                  </View>
                )}
                {s.status === "rejected" && (
                  <View style={styles.resolvedRow}>
                    <Ionicons name="close-circle" size={14} color={theme.colors.danger} />
                    <Text style={[styles.resolvedText, { color: theme.colors.danger }]}>Rejected</Text>
                  </View>
                )}
              </View>
            );
          })}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  subtitle: { color: "#F59E0B", fontSize: 12, fontWeight: "600", marginTop: 2 },
  filterRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 3, gap: 3 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: theme.radius.sm, alignItems: "center" },
  filterBtnActive: { backgroundColor: theme.colors.cardElevated },
  filterText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  filterTextActive: { color: theme.colors.text, fontWeight: "600" },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  cardHighlight: { borderColor: "#F59E0B", borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardDate: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  cardTime: { color: theme.colors.text, fontSize: 17, fontWeight: "600", marginTop: 2 },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 3 },
  partyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.md, padding: 12, marginBottom: 10 },
  partyBox: { flex: 1 },
  partyLabel: { color: theme.colors.textTertiary, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, marginBottom: 3 },
  partyName: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  reason: { color: theme.colors.textTertiary, fontSize: 13, fontStyle: "italic", marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: theme.radius.md, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  rejectBtnText: { color: theme.colors.danger, fontSize: 14, fontWeight: "600" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: theme.radius.md, backgroundColor: "#22C55E" },
  approveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  resolvedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  resolvedText: { fontSize: 13, fontWeight: "500" },
  emptyBlock: { alignItems: "center", paddingVertical: 64, gap: 10 },
  emptyText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: "500" },
  toast: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: theme.colors.card, padding: 12, borderRadius: theme.radius.md, alignItems: "center" },
  toastText: { color: theme.colors.text, fontSize: 14 },
});
