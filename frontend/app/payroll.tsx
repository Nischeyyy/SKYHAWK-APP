import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Modal,
} from "react-native";
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
  const [stubPeriod, setStubPeriod] = useState<any>(null);
  const [stubLoading, setStubLoading] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api("/payroll"); setData(d); } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openStub = async (period: any) => {
    setStubPeriod(period);
    if (!period.line_items) {
      setStubLoading(true);
      try {
        const detail = await api(`/payroll/${period.id}/stub`);
        setStubPeriod(detail);
      } catch {}
      setStubLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

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

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {current && (
          <View testID="current-period" style={styles.currentSection}>
            <Text style={styles.groupLabel}>Next Payday</Text>
            <Text style={styles.payDate}>
              {new Date(current.pay_date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {((current.hours_regular ?? 0) + (current.hours_overtime ?? 0)).toFixed(1)}h
                </Text>
                <Text style={styles.metricLabel}>Total Hours</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatCurrency(current.gross)}</Text>
                <Text style={styles.metricLabel}>Gross</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatCurrency(current.net)}</Text>
                <Text style={styles.metricLabel}>Net Pay</Text>
              </View>
            </View>

            {(current.hours_overtime ?? 0) > 0 && (
              <View style={styles.overtimeBadge}>
                <Ionicons name="time-outline" size={14} color={theme.colors.warning} />
                <Text style={styles.overtimeText}>
                  {(current.hours_overtime ?? 0).toFixed(1)}h overtime
                  {current.overtime_multiplier ? ` @ ${current.overtime_multiplier}x` : ""}
                </Text>
              </View>
            )}

            <View style={styles.pipeline}>
              {STAGES.map((s, i) => {
                const active = i <= currentIdx;
                return (
                  <View key={s.id} style={styles.stage}>
                    <View style={styles.stageRow}>
                      <View style={[styles.dot, active && styles.dotActive]} />
                      {i < STAGES.length - 1 && (
                        <View style={[styles.line, i < currentIdx && styles.lineActive]} />
                      )}
                    </View>
                    <Text style={[styles.stageLabel, active && styles.stageLabelActive]}>
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!current && (
          <View style={{ alignItems: "center", paddingTop: 60, paddingBottom: 20 }}>
            <Ionicons name="receipt-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 12 }}>
              No payroll periods yet
            </Text>
          </View>
        )}

        <Text style={styles.groupLabel}>History</Text>
        <View style={styles.historyList}>
          {(data?.periods ?? []).length === 0 && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, padding: 16, textAlign: "center" }}>
              No history available
            </Text>
          )}
          {(data?.periods ?? []).map((p: any, i: number, arr: any[]) => (
            <Pressable
              key={p.id}
              testID={`period-${p.id}`}
              onPress={() => openStub(p)}
              style={[styles.periodRow, i < arr.length - 1 && styles.periodRowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.periodDates}>
                  {new Date(p.period_start).toLocaleDateString()} –{" "}
                  {new Date(p.period_end).toLocaleDateString()}
                </Text>
                <Text style={styles.periodHours}>
                  {((p.hours_regular ?? 0) + (p.hours_overtime ?? 0)).toFixed(1)}h ·{" "}
                  {formatCurrency(p.gross)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.status}>{p.status.replace("_", " ")}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Pay Stub Detail Modal */}
      <Modal
        visible={!!stubPeriod}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStubPeriod(null)}
      >
        {stubPeriod && (
          <SafeAreaView style={styles.safe} edges={["top"]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Stub</Text>
              <Pressable onPress={() => setStubPeriod(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            {stubLoading ? (
              <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
            ) : (
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
                {/* Header */}
                <View style={styles.stubHeader}>
                  <Text style={styles.stubCompany}>Skyhawk Security Operations</Text>
                  <Text style={styles.stubPeriod}>
                    Period: {new Date(stubPeriod.period_start).toLocaleDateString()} –{" "}
                    {new Date(stubPeriod.period_end).toLocaleDateString()}
                  </Text>
                  {stubPeriod.employee_number && (
                    <Text style={styles.stubEmpNum}>Employee #{stubPeriod.employee_number}</Text>
                  )}
                </View>

                {/* Earnings */}
                <Text style={styles.groupLabel}>Earnings</Text>
                <View style={styles.stubSection}>
                  <StubRow
                    label={`Regular (${(stubPeriod.hours_regular ?? 0).toFixed(1)}h @ ${formatCurrency(stubPeriod.hourly_rate ?? 0)}/hr)`}
                    value={formatCurrency((stubPeriod.hours_regular ?? 0) * (stubPeriod.hourly_rate ?? 0))}
                  />
                  {(stubPeriod.hours_overtime ?? 0) > 0 && (
                    <StubRow
                      label={`Overtime (${(stubPeriod.hours_overtime ?? 0).toFixed(1)}h @ ${stubPeriod.overtime_multiplier ?? 1.5}x)`}
                      value={formatCurrency(
                        (stubPeriod.hours_overtime ?? 0) *
                        (stubPeriod.hourly_rate ?? 0) *
                        (stubPeriod.overtime_multiplier ?? 1.5)
                      )}
                      accent
                    />
                  )}
                  <StubRow label="Gross Pay" value={formatCurrency(stubPeriod.gross)} bold last />
                </View>

                {/* Deductions */}
                <Text style={styles.groupLabel}>Deductions</Text>
                <View style={styles.stubSection}>
                  <StubRow
                    label={`Income Tax (${Math.round((stubPeriod.tax_rate ?? 0.28) * 100)}%)`}
                    value={`−${formatCurrency((stubPeriod.gross ?? 0) - (stubPeriod.net ?? 0))}`}
                    last
                  />
                </View>

                {/* Net Pay */}
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Net Pay</Text>
                  <Text style={styles.netValue}>{formatCurrency(stubPeriod.net)}</Text>
                </View>

                {/* Shift breakdown */}
                {stubPeriod.line_items && stubPeriod.line_items.length > 0 && (
                  <>
                    <Text style={styles.groupLabel}>
                      Shift Breakdown ({stubPeriod.line_items.length} shifts)
                    </Text>
                    <View style={styles.stubSection}>
                      {stubPeriod.line_items.map((li: any, i: number) => (
                        <StubRow
                          key={i}
                          label={li.date}
                          value={`${(li.hours ?? 0).toFixed(2)}h`}
                          last={i === stubPeriod.line_items.length - 1}
                        />
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.stubFooter}>
                  Pay Date:{" "}
                  {new Date(stubPeriod.pay_date).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </Text>
              </ScrollView>
            )}
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function StubRow({
  label, value, bold, accent, last,
}: {
  label: string; value: string; bold?: boolean; accent?: boolean; last?: boolean;
}) {
  return (
    <View style={[sr.row, !last && sr.border]}>
      <Text style={[sr.label, bold && { color: theme.colors.text, fontWeight: "600" }]}>
        {label}
      </Text>
      <Text
        style={[
          sr.value,
          bold && { color: theme.colors.text, fontWeight: "700" },
          accent && { color: theme.colors.warning },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  label: { color: theme.colors.textSecondary, fontSize: 14, flex: 1, paddingRight: 8 },
  value: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: "500" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  groupLabel: {
    color: theme.colors.textSecondary, fontSize: 12,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginTop: 20, marginBottom: 8,
  },
  currentSection: { marginTop: 10 },
  payDate: { color: theme.colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  metric: { flex: 1 },
  metricValue: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  metricLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
  overtimeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: "rgba(255,159,10,0.1)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: "flex-start",
  },
  overtimeText: { color: theme.colors.warning, fontSize: 13 },
  pipeline: { marginTop: 28 },
  stage: { flexDirection: "row", alignItems: "flex-start" },
  stageRow: { alignItems: "center", width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.border, marginTop: 4 },
  dotActive: { backgroundColor: theme.colors.text },
  line: { width: 2, height: 24, backgroundColor: theme.colors.border, marginTop: 2 },
  lineActive: { backgroundColor: theme.colors.text },
  stageLabel: { color: theme.colors.textSecondary, fontSize: 15, marginLeft: 12 },
  stageLabelActive: { color: theme.colors.text, fontWeight: "500" },
  historyList: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  periodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  periodRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  periodDates: { color: theme.colors.text, fontSize: 14 },
  periodHours: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  status: { color: theme.colors.textSecondary, fontSize: 13, textTransform: "capitalize" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider,
  },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  stubHeader: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider,
    marginBottom: 4,
  },
  stubCompany: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  stubPeriod: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  stubEmpNum: { color: theme.colors.textTertiary, fontSize: 13, marginTop: 2 },
  stubSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md, paddingHorizontal: 16, marginBottom: 4,
  },
  netRow: {
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, marginVertical: 16,
  },
  netLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  netValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  stubFooter: {
    color: theme.colors.textTertiary, fontSize: 13, textAlign: "center", marginTop: 20,
  },
});
