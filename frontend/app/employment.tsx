import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Employment() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await api("/profile"); setData(d); } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const u = data?.user || {};
  const status = u.employment_status || "Active";
  const isActive = status.toLowerCase().includes("active");

  const ROWS = [
    { label: "Employee Number", value: u.employee_number || "—" },
    { label: "Role", value: u.role ? u.role.replace(/^\w/, (c: string) => c.toUpperCase()) : "—" },
    { label: "Licence Number", value: u.licence_number || "—" },
    { label: "Licence Expiry", value: fmt(u.licence_expiry) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Employment</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>Employment Status</Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
          <StatusPill label={isActive ? "Active" : status} tone={isActive ? "verified" : "neutral"} />
        </View>

        <View style={styles.card}>
          {ROWS.map((r, i) => (
            <View key={r.label} style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        <Pressable testID="go-onboarding-from-employment" onPress={() => router.push("/onboarding")} style={styles.linkRow}>
          <Ionicons name="school-outline" size={19} color={theme.colors.text} style={{ marginRight: 14 }} />
          <Text style={styles.linkLabel}>View onboarding progress</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },

  statusCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: theme.colors.card, borderRadius: theme.radius.lg,
    paddingHorizontal: 16, paddingVertical: 16, marginTop: 12, marginBottom: 16,
  },
  statusLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
  statusValue: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, paddingHorizontal: 16, marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  rowValue: { color: theme.colors.text, fontSize: 14, fontWeight: "500" },

  linkRow: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  linkLabel: { flex: 1, color: theme.colors.text, fontSize: 15 },
});
