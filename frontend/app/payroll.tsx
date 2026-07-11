import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatCurrency } from "@/src/utils/format";

const STAGES = [
  { id: "submitted", label: "Submitted", icon: "cloud-upload" as const },
  { id: "under_review", label: "Under Review", icon: "eye" as const },
  { id: "released", label: "Released", icon: "checkmark-done" as const },
  { id: "paid", label: "Paid", icon: "cash" as const },
];

export default function Payroll() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api("/payroll");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const current = data?.current;
  const currentIdx = STAGES.findIndex((s) => s.id === current?.status);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>PAYROLL</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}>
        {current && (
          <View style={styles.heroCard} testID="current-period">
            <Text style={styles.heroLabel}>NEXT PAYDAY</Text>
            <Text style={styles.heroDate}>{new Date(current.pay_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</Text>
            <View style={styles.heroMetrics}>
              <View>
                <Text style={styles.metricLabel}>HOURS</Text>
                <Text style={styles.metricValue}>{(current.hours_regular + current.hours_overtime).toFixed(1)}h</Text>
                {current.hours_overtime > 0 && <Text style={styles.otText}>+{current.hours_overtime}h OT</Text>}
              </View>
              <View>
                <Text style={styles.metricLabel}>GROSS</Text>
                <Text style={styles.metricValue}>{formatCurrency(current.gross)}</Text>
              </View>
              <View>
                <Text style={styles.metricLabel}>NET</Text>
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>{formatCurrency(current.net)}</Text>
              </View>
            </View>

            <View style={styles.pipeline}>
              {STAGES.map((s, i) => {
                const active = i <= currentIdx;
                const complete = i < currentIdx;
                return (
                  <View key={s.id} style={styles.stageWrap}>
                    <View style={[styles.stageCircle, active && styles.stageCircleActive, complete && styles.stageCircleComplete]}>
                      <Ionicons name={complete ? "checkmark" : s.icon} size={16}
                        color={active ? theme.colors.onBrandPrimary : theme.colors.onSurfaceTertiary} />
                    </View>
                    <Text style={[styles.stageLabel, active && { color: theme.colors.onSurface }]}>{s.label}</Text>
                    {i < STAGES.length - 1 && <View style={[styles.stageLine, complete && { backgroundColor: theme.colors.brandPrimary }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.summaryLabel}>ALL-TIME</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data?.total_hours?.toFixed(1) || 0}h</Text>
            <Text style={styles.summarySub}>Total Hours</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{formatCurrency(data?.total_gross || 0)}</Text>
            <Text style={styles.summarySub}>Total Earned</Text>
          </View>
        </View>

        <Text style={styles.historyLabel}>PAY HISTORY</Text>
        {(data?.periods || []).map((p: any) => (
          <View key={p.id} testID={`period-${p.id}`} style={styles.periodCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.periodDates}>
                {new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}
              </Text>
              <Text style={styles.periodHours}>{(p.hours_regular + p.hours_overtime).toFixed(1)}h · {formatCurrency(p.gross)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: statusColor(p.status) + "22" }]}>
              <Text style={[styles.pillText, { color: statusColor(p.status) }]}>{p.status.replace("_", " ").toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(s: string) {
  return s === "paid" ? theme.colors.success :
    s === "released" ? theme.colors.brandPrimary :
    s === "under_review" ? theme.colors.info : theme.colors.onSurfaceTertiary;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  heroCard: { backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.xl,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.brandPrimary },
  heroLabel: { color: theme.colors.brandPrimary, fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  heroDate: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 6 },
  heroMetrics: { flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xl },
  metricLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  metricValue: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "900", marginTop: 4 },
  otText: { color: theme.colors.warning, fontSize: 11, fontWeight: "700", marginTop: 2 },
  pipeline: { flexDirection: "row", marginTop: theme.spacing.xl, alignItems: "flex-start" },
  stageWrap: { alignItems: "center", flex: 1, position: "relative" },
  stageCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.border },
  stageCircleActive: { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
  stageCircleComplete: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  stageLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 10, marginTop: 6, textAlign: "center", fontWeight: "600" },
  stageLine: { position: "absolute", top: 16, left: "60%", right: "-40%", height: 2, backgroundColor: theme.colors.border, zIndex: -1 },
  summaryLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800",
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  summaryRow: { flexDirection: "row", gap: theme.spacing.md },
  summaryBox: { flex: 1, backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  summaryValue: { color: theme.colors.onSurface, fontSize: 18, fontWeight: "800" },
  summarySub: { color: theme.colors.onSurfaceTertiary, fontSize: 11, marginTop: 4 },
  historyLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800",
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  periodCard: { flexDirection: "row", alignItems: "center", padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  periodDates: { color: theme.colors.onSurface, fontSize: 13, fontWeight: "600" },
  periodHours: { color: theme.colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
