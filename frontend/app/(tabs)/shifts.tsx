import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Chip } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, formatCurrency, hoursBetween } from "@/src/utils/format";

export default function OpenShifts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "urgent" | "high_pay">("all");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/open-shifts");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const claim = async (shiftId: string) => {
    setClaiming(shiftId);
    try {
      const r: any = await api(`/open-shifts/${shiftId}/claim`, { method: "POST" });
      showToast(r.status === "waitlisted" ? "Added to waitlist" : "Shift claimed!");
      await load();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setClaiming(null);
    }
  };

  const cancel = async (shiftId: string) => {
    setClaiming(shiftId);
    try {
      await api(`/open-shifts/${shiftId}/cancel-claim`, { method: "POST" });
      showToast("Claim cancelled");
      await load();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setClaiming(null);
    }
  };

  let shifts: any[] = data?.shifts || [];
  if (filter === "urgent") shifts = shifts.filter((s) => s.urgent);
  if (filter === "high_pay") shifts = [...shifts].sort((a, b) => b.pay_rate - a.pay_rate);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>OPEN SHIFTS</Text>
        <Text style={styles.subtitle}>Claim shifts posted by dispatch</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        <Chip testID="filter-all" label="All Available" active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip testID="filter-urgent" label="⚡ Urgent" active={filter === "urgent"} onPress={() => setFilter("urgent")} />
        <Chip testID="filter-high-pay" label="Best Pay" active={filter === "high_pay"} onPress={() => setFilter("high_pay")} />
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 4, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.brandPrimary} />}
        >
          {shifts.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={theme.colors.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No open shifts matching your criteria</Text>
            </View>
          )}
          {shifts.map((s) => {
            const hrs = hoursBetween(s.start, s.end);
            const total = hrs * s.pay_rate;
            const spotsLeft = s.spots_available - (s.claimed_by?.length || 0);
            return (
              <View key={s.id} testID={`open-shift-${s.id}`} style={styles.card}>
                {s.urgent && (
                  <View style={styles.urgentBadge}>
                    <Ionicons name="flash" size={11} color={theme.colors.onBrandPrimary} />
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateText}>{formatDate(s.start)}</Text>
                    <Text style={styles.timeText}>{formatShiftTime(s.start)} — {formatShiftTime(s.end)}</Text>
                  </View>
                  <View style={styles.payBox}>
                    <Text style={styles.payRate}>{formatCurrency(s.pay_rate)}<Text style={styles.perHr}>/hr</Text></Text>
                    <Text style={styles.payTotal}>~{formatCurrency(total)}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.role}>{s.role}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location" size={12} color={theme.colors.brandPrimary} />
                  <Text style={styles.siteName}>{s.site?.name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="people" size={12} color={theme.colors.onSurfaceTertiary} />
                  <Text style={styles.spots}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} · {hrs}h shift</Text>
                </View>

                {s.already_claimed ? (
                  <Pressable
                    testID={`cancel-claim-${s.id}`}
                    onPress={() => cancel(s.id)}
                    disabled={claiming === s.id}
                    style={[styles.action, { backgroundColor: theme.colors.surfaceTertiary }]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>CLAIMED · Cancel</Text>
                  </Pressable>
                ) : s.on_waitlist ? (
                  <Pressable
                    testID={`leave-waitlist-${s.id}`}
                    onPress={() => cancel(s.id)}
                    disabled={claiming === s.id}
                    style={[styles.action, { backgroundColor: theme.colors.surfaceTertiary }]}
                  >
                    <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>ON WAITLIST · Leave</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    testID={`claim-${s.id}`}
                    onPress={() => claim(s.id)}
                    disabled={claiming === s.id}
                    style={styles.action}
                  >
                    {claiming === s.id ? (
                      <ActivityIndicator color={theme.colors.onBrandPrimary} size="small" />
                    ) : (
                      <>
                        <Text style={styles.actionText}>{spotsLeft > 0 ? "CLAIM SHIFT" : "JOIN WAITLIST"}</Text>
                        <Ionicons name="arrow-forward" size={16} color={theme.colors.onBrandPrimary} />
                      </>
                    )}
                  </Pressable>
                )}
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
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  title: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  chipsScroll: { maxHeight: 56, marginTop: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chipsRow: { paddingHorizontal: theme.spacing.lg, gap: 8, alignItems: "center", paddingVertical: theme.spacing.sm },
  card: {
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.md, position: "relative",
  },
  urgentBadge: {
    position: "absolute", top: -8, right: 12, backgroundColor: theme.colors.brandPrimary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm,
    flexDirection: "row", gap: 3, alignItems: "center",
  },
  urgentText: { color: theme.colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  dateText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  timeText: { color: theme.colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 2 },
  payBox: { alignItems: "flex-end" },
  payRate: { color: theme.colors.onSurface, fontSize: 20, fontWeight: "900" },
  perHr: { fontSize: 12, color: theme.colors.onSurfaceTertiary, fontWeight: "500" },
  payTotal: { color: theme.colors.success, fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
  role: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  siteName: { color: theme.colors.onSurfaceSecondary, fontSize: 13 },
  spots: { color: theme.colors.onSurfaceTertiary, fontSize: 12 },
  action: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.brandPrimary,
    padding: 12, borderRadius: theme.radius.md, flexDirection: "row",
    justifyContent: "center", alignItems: "center", gap: 6,
  },
  actionText: { color: theme.colors.onBrandPrimary, fontWeight: "800", fontSize: 13, letterSpacing: 1 },
  empty: { alignItems: "center", padding: theme.spacing.xxxl },
  emptyText: { color: theme.colors.onSurfaceTertiary, marginTop: theme.spacing.md, fontSize: 14 },
  toast: {
    position: "absolute", bottom: 90, left: theme.spacing.lg, right: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceTertiary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.brandPrimary,
  },
  toastText: { color: theme.colors.onSurface, textAlign: "center", fontWeight: "600" },
});
