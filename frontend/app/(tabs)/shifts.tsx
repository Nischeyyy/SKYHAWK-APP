import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, formatCurrency, hoursBetween } from "@/src/utils/format";
import { success as hapticSuccess, impact as hapticImpact } from "@/src/utils/haptics";

export default function OpenShifts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/open-shifts");
      setData(d);
    } catch (e: any) {
      if (e.message !== 'SESSION_EXPIRED') showToast(e.message || 'Failed to load shifts');
    }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const claim = async (id: string) => {
    hapticImpact();
    setClaiming(id);
    try {
      const r: any = await api(`/open-shifts/${id}/claim`, { method: "POST" });
      hapticSuccess();
      showToast(r.status === "waitlisted" ? "Added to waitlist" : "Shift claimed");
      await load();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setClaiming(null);
    }
  };

  const cancel = async (id: string) => {
    hapticImpact();
    setClaiming(id);
    try {
      await api(`/open-shifts/${id}/cancel-claim`, { method: "POST" });
      hapticSuccess();
      showToast("Claim cancelled");
      await load();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setClaiming(null);
    }
  };

  const shifts: any[] = data?.shifts || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Open Shifts</Text>
        <Text style={styles.subtitle}>{shifts.length} available</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.textSecondary} />}
          showsVerticalScrollIndicator={false}
        >
          {shifts.length === 0 && <Text style={styles.empty}>No open shifts</Text>}
          {shifts.map((s, idx) => {
            const hrs = hoursBetween(s.start, s.end);
            const spotsLeft = s.spots_available - (s.claimed_by?.length || 0);
            const claimed = s.already_claimed;
            const waitlisted = s.on_waitlist;
            const isTopPick = idx === 0 && !claimed && !waitlisted; // Filled button only for #1
            return (
              <View
                key={s.id}
                testID={`open-shift-${s.id}`}
                style={[styles.item, idx < shifts.length - 1 && styles.itemBorder]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.itemDate}>{formatDate(s.start)}</Text>
                    {isTopPick && <StatusPill label="Top Pick" tone="accent" />}
                    {s.urgent && <StatusPill label="Urgent" tone="warning" />}
                  </View>
                  <Text style={styles.itemPay}>{formatCurrency(s.pay_rate)}<Text style={styles.perHr}>/hr</Text></Text>
                </View>
                <Text style={styles.itemTime}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.itemSite}>{s.site?.name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="shield-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.itemMeta}>{s.role} · {hrs}h · {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""}</Text>
                </View>

                <View style={{ marginTop: 14 }}>
                  {claiming === s.id ? (
                    <ActivityIndicator color={theme.colors.accent} size="small" />
                  ) : claimed ? (
                    <Pressable testID={`cancel-claim-${s.id}`} onPress={() => cancel(s.id)} style={styles.claimedBtn}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.verified} />
                      <Text style={styles.claimedText}>Claimed · Tap to Cancel</Text>
                    </Pressable>
                  ) : waitlisted ? (
                    <Pressable testID={`leave-waitlist-${s.id}`} onPress={() => cancel(s.id)} style={styles.outlineBtn}>
                      <Text style={styles.outlineText}>On Waitlist · Leave</Text>
                    </Pressable>
                  ) : isTopPick ? (
                    <Pressable testID={`claim-${s.id}`} onPress={() => claim(s.id)} style={styles.primaryBtn}>
                      <Text style={styles.primaryText}>{spotsLeft > 0 ? "Claim Shift" : "Join Waitlist"}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </Pressable>
                  ) : (
                    <Pressable testID={`claim-${s.id}`} onPress={() => claim(s.id)} style={styles.linkBtn}>
                      <Text style={styles.linkText}>{spotsLeft > 0 ? "Claim" : "Join Waitlist"}</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.colors.accent} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      {toast && (
        <View testID="toast" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  item: { paddingVertical: 18 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  itemDate: { color: theme.colors.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  itemPay: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  perHr: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "400" },
  itemTime: { color: theme.colors.text, fontSize: 18, fontWeight: "500", marginTop: 6 },
  itemSite: { color: theme.colors.text, fontSize: 15, marginLeft: 4 },
  itemMeta: { color: theme.colors.textSecondary, fontSize: 13, marginLeft: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  primaryBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  outlineBtn: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineText: { color: theme.colors.text, fontSize: 14 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  linkText: { color: theme.colors.accent, fontSize: 14, fontWeight: "500" },
  claimedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  claimedText: { color: theme.colors.textSecondary, fontSize: 13 },
  claimBtn: { backgroundColor: theme.colors.text, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
  claimText: { color: theme.colors.bg, fontSize: 15, fontWeight: "600" },
  actionBtn: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md, paddingVertical: 12, alignItems: "center" },
  actionText: { color: theme.colors.text, fontSize: 14 },
  empty: { color: theme.colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  toast: {
    position: "absolute", bottom: 90, left: 20, right: 20,
    backgroundColor: theme.colors.card, padding: 14, borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border,
  },
  toastText: { color: theme.colors.text, textAlign: "center", fontSize: 14 },
});
