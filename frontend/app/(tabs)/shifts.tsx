import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, hoursBetween } from "@/src/utils/format";
import { success as hapticSuccess, impact as hapticImpact } from "@/src/utils/haptics";

// ─── Light palette (matches Profile / Community / Wallet) ──────────────────
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  divider: "#E5E5EA",
  text: "#0B0B0C",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  accentSoft: "rgba(10,132,255,0.12)",
  warning: "#C77700",
  warningSoft: "rgba(199,119,0,0.12)",
  verified: "#2FAE59",
  bannerBg: "#E8F1FF",
};

function Badge({ label, tone }: { label: string; tone: "accent" | "warning" }) {
  const isAccent = tone === "accent";
  return (
    <View style={[styles.badge, { backgroundColor: isAccent ? C.accentSoft : C.warningSoft }]}>
      {isAccent ? (
        <Ionicons name="star" size={11} color={C.accent} />
      ) : (
        <Ionicons name="flash" size={11} color={C.warning} />
      )}
      <Text style={[styles.badgeText, { color: isAccent ? C.accent : C.warning }]}>{label}</Text>
    </View>
  );
}

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
        <View>
          <Text style={styles.title}>Open Shifts</Text>
          <Text style={styles.subtitle}>{shifts.length} available</Text>
        </View>
        <Pressable testID="filter-btn" hitSlop={10} style={styles.filterBtn}>
          <Ionicons name="filter" size={18} color={C.text} />
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={C.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.textSecondary} />}
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
              <View key={s.id} testID={`open-shift-${s.id}`} style={styles.card}>
                <View style={styles.itemHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, flexWrap: "wrap" }}>
                    <Text style={styles.itemDate}>{formatDate(s.start)}</Text>
                    {isTopPick && <Badge label="Top Pick" tone="accent" />}
                    {s.urgent && <Badge label="Urgent" tone="warning" />}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
                </View>
                <Text style={styles.itemTime}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={14} color={C.textSecondary} />
                  <Text style={styles.itemSite}>{s.site?.name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="shield-outline" size={14} color={C.textSecondary} />
                  <Text style={styles.itemMeta}>{s.role} · {hrs}h · {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""}</Text>
                </View>

                <View style={{ marginTop: 14 }}>
                  {claiming === s.id ? (
                    <ActivityIndicator color={C.accent} size="small" />
                  ) : claimed ? (
                    <Pressable testID={`cancel-claim-${s.id}`} onPress={() => cancel(s.id)} style={styles.claimedBtn}>
                      <Ionicons name="checkmark-circle" size={16} color={C.verified} />
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
                      <Ionicons name="arrow-forward" size={14} color={C.accent} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

          {shifts.length > 0 && (
            <View style={styles.banner} testID="alerts-banner">
              <View style={styles.bannerIcon}>
                <Ionicons name="calendar" size={16} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>New shifts are posted daily</Text>
                <Text style={styles.bannerSub}>Check back often to grab the best opportunities.</Text>
              </View>
              <Pressable testID="turn-on-alerts" hitSlop={8}>
                <Text style={styles.bannerLink}>Turn on alerts</Text>
              </Pressable>
            </View>
          )}
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
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  title: { color: C.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: C.textSecondary, fontSize: 14, marginTop: 4 },
  filterBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center", marginTop: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemDate: { color: C.textSecondary, fontSize: 13, fontWeight: "500" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  itemTime: { color: C.text, fontSize: 19, fontWeight: "700", marginTop: 10 },
  itemSite: { color: C.text, fontSize: 15, marginLeft: 4, fontWeight: "500" },
  itemMeta: { color: C.textSecondary, fontSize: 13, marginLeft: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  outlineBtn: {
    borderColor: C.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineText: { color: C.text, fontSize: 14 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  linkText: { color: C.accent, fontSize: 14, fontWeight: "600" },
  claimedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  claimedText: { color: C.textSecondary, fontSize: 13 },
  empty: { color: C.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.bannerBg, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 12,
  },
  bannerIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { color: C.text, fontSize: 13.5, fontWeight: "600" },
  bannerSub: { color: C.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  bannerLink: { color: C.accent, fontSize: 12.5, fontWeight: "600" },
  toast: {
    position: "absolute", bottom: 90, left: 20, right: 20,
    backgroundColor: C.card, padding: 14, borderRadius: 14,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  toastText: { color: C.text, textAlign: "center", fontSize: 14 },
});
