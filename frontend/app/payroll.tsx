import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatCurrency } from "@/src/utils/format";

const STAGES = [
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under Review" },
  { id: "released", label: "Released" },
  { id: "paid", label: "Paid" },
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

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;

  const current = data?.current;
  const currentIdx = STAGES.findIndex((s) => s.id === current?.status);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Payroll</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {current && (
          <View testID="current-period" style={styles.currentSection}>
            <Text style={styles.groupLabel}>Next Payday</Text>
            <Text style={styles.payDate}>{new Date(current.pay_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{(current.hours_regular + current.hours_overtime).toFixed(1)}h</Text>
                <Text style={styles.metricLabel}>Hours</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatCurrency(current.gross)}</Text>
                <Text style={styles.metricLabel}>Gross</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatCurrency(current.net)}</Text>
                <Text style={styles.metricLabel}>Net</Text>
              </View>
            </View>

            <View style={styles.pipeline}>
              {STAGES.map((s, i) => {
                const active = i <= currentIdx;
                return (
                  <View key={s.id} style={styles.stage}>
                    <View style={styles.stageRow}>
                      <View style={[styles.dot, active && styles.dotActive]} />
                      {i < STAGES.length - 1 && <View style={[styles.line, i < currentIdx && styles.lineActive]} />}
                    </View>
                    <Text style={[styles.stageLabel, active && styles.stageLabelActive]}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.groupLabel}>History</Text>
        <View style={styles.historyList}>
          {(data?.periods || []).map((p: any, i: number, arr: any[]) => (
            <View key={p.id} testID={`period-${p.id}`} style={[styles.periodRow, i < arr.length - 1 && styles.periodRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.periodDates}>{new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}</Text>
                <Text style={styles.periodHours}>{(p.hours_regular + p.hours_overtime).toFixed(1)}h · {formatCurrency(p.gross)}</Text>
              </View>
              <Text style={styles.status}>{p.status.replace("_", " ")}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  groupLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  currentSection: { marginTop: 10 },
  payDate: { color: theme.colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  metric: { flex: 1 },
  metricValue: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  metricLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
  pipeline: { marginTop: 28 },
  stage: { flexDirection: "row", alignItems: "flex-start", position: "relative" },
  stageRow: { alignItems: "center", width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.border, marginTop: 4 },
  dotActive: { backgroundColor: theme.colors.text },
  line: { width: 2, height: 24, backgroundColor: theme.colors.border, marginTop: 2 },
  lineActive: { backgroundColor: theme.colors.text },
  stageLabel: { color: theme.colors.textSecondary, fontSize: 15, marginLeft: 12 },
  stageLabelActive: { color: theme.colors.text, fontWeight: "500" },
  historyList: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  periodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  periodRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  periodDates: { color: theme.colors.text, fontSize: 14 },
  periodHours: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  status: { color: theme.colors.textSecondary, fontSize: 13, textTransform: "capitalize" },
});
