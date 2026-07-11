import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

const STEPS = [
  { key: "documents_uploaded", label: "Upload ID Documents", icon: "document" },
  { key: "sin_submitted", label: "Submit SIN", icon: "keypad" },
  { key: "direct_deposit_submitted", label: "Direct Deposit Info", icon: "card" },
  { key: "emergency_contact_added", label: "Emergency Contact", icon: "call" },
  { key: "agreements_signed", label: "Sign Employment Agreements", icon: "create" },
  { key: "training_complete", label: "Complete Training Modules", icon: "school" },
];

export default function Onboarding() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api("/onboarding/status");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} /></SafeAreaView>;
  }

  const status = data?.status || {};
  const pct = data?.percent || 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>ONBOARDING</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressValue}>{pct}%</Text>
            <Text style={styles.progressSteps}>{data?.completed} of {data?.total} steps</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          {pct === 100 && (
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={styles.doneText}>All steps complete — ready for duty</Text>
            </View>
          )}
        </View>

        <Text style={styles.stepsLabel}>STEPS</Text>
        {STEPS.map((s, i) => {
          const done = status[s.key];
          return (
            <View key={s.key} testID={`step-${s.key}`} style={[styles.stepRow, done && styles.stepRowDone]}>
              <View style={[styles.stepIcon, done && styles.stepIconDone]}>
                <Ionicons name={done ? "checkmark" : (s.icon as any)} size={18}
                  color={done ? theme.colors.onBrandPrimary : theme.colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepIndex}>STEP {i + 1}</Text>
                <Text style={styles.stepLabel}>{s.label}</Text>
              </View>
              {done ? (
                <Text style={styles.stepDone}>DONE</Text>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  progressCard: { backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.xl,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  progressLabel: { color: theme.colors.brandPrimary, fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 },
  progressValue: { color: theme.colors.onSurface, fontSize: 44, fontWeight: "900", letterSpacing: -1 },
  progressSteps: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: theme.colors.surfaceTertiary, borderRadius: 4, marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.brandPrimary },
  doneBadge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: theme.spacing.md,
    padding: 8, backgroundColor: "rgba(16,185,129,0.1)", borderRadius: theme.radius.sm },
  doneText: { color: theme.colors.success, fontSize: 12, fontWeight: "700" },
  stepsLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800",
    marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  stepRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    padding: theme.spacing.md, backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm },
  stepRowDone: { borderColor: theme.colors.brandTertiary },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brandTertiary,
    alignItems: "center", justifyContent: "center" },
  stepIconDone: { backgroundColor: theme.colors.brandPrimary },
  stepIndex: { color: theme.colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  stepLabel: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 2 },
  stepDone: { color: theme.colors.success, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});
