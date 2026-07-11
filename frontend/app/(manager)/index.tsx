import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Avatar, StatusPill } from "@/src/ui";
import { relativeTime, formatShiftTime } from "@/src/utils/format";

function StatCard({ icon, label, value, tone }: { icon: any; label: string; value: number | string; tone?: string }) {
  const accent = tone === "warning" ? theme.colors.warning : tone === "danger" ? theme.colors.danger : tone === "verified" ? theme.colors.verified : theme.colors.accent;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ManagerOverview() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/admin/dashboard");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const firstName = user?.full_name?.split(" ")[0] ?? "Admin";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 60 }} /></SafeAreaView>;
  }

  const severityTone = (s: string) => s === "critical" ? "danger" : s === "warning" ? "warning" : "accent";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName}</Text>
            <Text style={styles.subGreeting}>Manager Dashboard</Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="people" label="Guards" value={data?.total_guards ?? 0} tone="accent" />
          <StatCard icon="calendar" label="Shifts Today" value={data?.shifts_today ?? 0} tone="accent" />
          <StatCard icon="radio-button-on" label="Clocked In" value={data?.active_clocked ?? 0} tone="verified" />
          <StatCard icon="warning" label="Open Incidents" value={data?.open_incidents ?? 0} tone={data?.open_incidents > 0 ? "danger" : "accent"} />
        </View>

        {data?.pending_payroll > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="time-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.alertText}>{data.pending_payroll} payroll record{data.pending_payroll !== 1 ? "s" : ""} need review</Text>
          </View>
        )}

        {/* Active guards */}
        {(data?.active_entries ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            {data.active_entries.map((e: any) => (
              <View key={e.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Avatar name={e.user?.full_name} size={36} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{e.user?.full_name ?? "Unknown"}</Text>
                    <Text style={styles.cardMeta}>{e.site?.name ?? "Unknown site"} · Since {formatShiftTime(e.clock_in)}</Text>
                  </View>
                  <StatusPill label={e.geofence_ok ? "In zone" : "⚠ Out of zone"} tone={e.geofence_ok ? "verified" : "warning"} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent incidents */}
        {(data?.recent_incidents ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Incidents</Text>
            {data.recent_incidents.map((inc: any) => (
              <View key={inc.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.incidentDot, { backgroundColor: inc.severity === "critical" ? theme.colors.danger : inc.severity === "high" ? theme.colors.warning : theme.colors.accent }]} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{inc.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
                    <Text style={styles.cardMeta}>{inc.user_name} · {relativeTime(inc.created_at)}</Text>
                  </View>
                  <StatusPill label={inc.status} tone={inc.status === "submitted" ? "warning" : inc.status === "resolved" ? "verified" : "neutral"} />
                </View>
              </View>
            ))}
          </View>
        )}

        {data?.active_clocked === 0 && (data?.recent_incidents ?? []).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyBody}>No active incidents or alerts right now.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { color: theme.colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  subGreeting: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 2 },
  logoutBtn: { padding: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "44%", backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { color: theme.colors.text, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,159,10,0.12)", borderRadius: theme.radius.md, padding: 12, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.warning },
  alertText: { color: theme.colors.warning, fontSize: 13, fontWeight: "500" },
  section: { marginBottom: 28 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600", marginBottom: 12 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfo: { flex: 1 },
  cardName: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  incidentDot: { width: 10, height: 10, borderRadius: 5 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "600", marginTop: 12 },
  emptyBody: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 6 },
});
