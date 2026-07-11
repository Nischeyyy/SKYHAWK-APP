import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, hoursBetween, formatCurrency } from "@/src/utils/format";

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    try {
      const d: any = await api(`/shifts/${id}`);
      setS(d);
    } catch {}
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ackInstructions = async () => {
    setAcking(true);
    try {
      await api(`/shifts/${id}/acknowledge-instructions`, { method: "POST" });
      setS((prev: any) => ({ ...prev, instructions_acknowledged: true }));
    } catch {}
    setAcking(false);
  };

  if (loading || !s) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} /></SafeAreaView>;
  }
  const hrs = hoursBetween(s.start, s.end);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>SHIFT DETAILS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}>
        <View style={styles.heroCard}>
          <Text style={styles.dateLabel}>{formatDate(s.start)}</Text>
          <Text style={styles.timeText}>{formatShiftTime(s.start)} — {formatShiftTime(s.end)}</Text>
          <Text style={styles.role}>{s.role}</Text>
          <View style={styles.metrics}>
            <View><Text style={styles.metricLabel}>HOURS</Text><Text style={styles.metricValue}>{hrs}h</Text></View>
            <View><Text style={styles.metricLabel}>RATE</Text><Text style={styles.metricValue}>{formatCurrency(s.pay_rate)}/hr</Text></View>
            <View><Text style={styles.metricLabel}>EST.</Text><Text style={[styles.metricValue, { color: theme.colors.success }]}>{formatCurrency(hrs * s.pay_rate)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SITE</Text>
          <Text style={styles.siteName}>{s.site?.name}</Text>
          <Text style={styles.address}>{s.site?.address}</Text>
          <Pressable
            testID="navigate-btn"
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(s.site?.address || "")}`)}
            style={styles.navBtn}
          >
            <Ionicons name="navigate" size={16} color={theme.colors.onBrandPrimary} />
            <Text style={styles.navBtnText}>OPEN IN MAPS</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPERVISOR</Text>
          <View style={styles.supRow}>
            <Text style={styles.supName}>{s.site?.supervisor}</Text>
            <Pressable
              testID="call-supervisor"
              onPress={() => Linking.openURL(`tel:${s.site?.supervisor_phone}`)}
              style={styles.callBtn}
            >
              <Ionicons name="call" size={14} color={theme.colors.brandPrimary} />
              <Text style={styles.callText}>{s.site?.supervisor_phone}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SITE INSTRUCTIONS</Text>
          <Text style={styles.instructions}>{s.site?.instructions}</Text>
          {!s.instructions_acknowledged ? (
            <Button testID="ack-instructions" label={acking ? "..." : "ACKNOWLEDGE INSTRUCTIONS"} onPress={ackInstructions}
              disabled={acking} style={{ marginTop: theme.spacing.md }} />
          ) : (
            <View style={styles.ackBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={styles.ackText}>Acknowledged</Text>
            </View>
          )}
        </View>

        {s.status === "scheduled" && (
          <Button testID="clock-in-shift" label="GO TO TIME CLOCK"
            onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: s.id } })}
            style={{ marginTop: theme.spacing.lg }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  heroCard: { backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.xl,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.brandPrimary },
  dateLabel: { color: theme.colors.brandPrimary, fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  timeText: { color: theme.colors.onSurface, fontSize: 26, fontWeight: "900", marginTop: 6 },
  role: { color: theme.colors.brandPrimary, fontSize: 14, fontWeight: "700", marginTop: 4 },
  metrics: { flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.lg },
  metricLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  metricValue: { color: theme.colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 2 },
  section: { backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.lg,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginTop: theme.spacing.md },
  sectionLabel: { color: theme.colors.brandPrimary, fontSize: 11, letterSpacing: 1.5, fontWeight: "800", marginBottom: theme.spacing.sm },
  siteName: { color: theme.colors.onSurface, fontSize: 16, fontWeight: "700" },
  address: { color: theme.colors.onSurfaceSecondary, fontSize: 13, marginTop: 4 },
  navBtn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.brandPrimary, padding: 10, borderRadius: theme.radius.md, marginTop: theme.spacing.md },
  navBtnText: { color: theme.colors.onBrandPrimary, fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  supRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  supName: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "700" },
  callBtn: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: theme.colors.brandTertiary,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.sm },
  callText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  instructions: { color: theme.colors.onSurfaceSecondary, fontSize: 13, lineHeight: 20 },
  ackBadge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: theme.spacing.md,
    padding: 8, backgroundColor: "rgba(16,185,129,0.1)", borderRadius: theme.radius.sm },
  ackText: { color: theme.colors.success, fontSize: 12, fontWeight: "700" },
});
