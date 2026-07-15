import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate, hoursBetween, formatCurrency } from "@/src/utils/format";

const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  divider: "#E5E5EA",
  text: "#0B0B0C",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  scheduled: { label: "Scheduled", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: "calendar-outline" },
  completed: { label: "Completed", color: "#22C55E", bg: "rgba(34,197,94,0.12)", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: "close-circle-outline" },
};

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    try { const d: any = await api(`/shifts/${id}`); setS(d); } catch {}
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

  if (loading || !s) return <SafeAreaView style={styles.safe}><ActivityIndicator color={C.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;

  const scheduledHrs = hoursBetween(s.start, s.end);
  const actualHrs = s.hours_worked ?? null;
  const statusCfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.scheduled;
  const isCompleted = s.status === "completed";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Shift Details</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.date}>{formatDate(s.start)}</Text>
          <Text style={styles.time}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
          <Text style={styles.site}>{s.site?.name}</Text>
          <Text style={styles.role}>{s.role}</Text>
        </View>

        <Text style={styles.groupLabel}>Pay Details</Text>
        <View style={styles.group}>
          <Row label="Scheduled Hours" value={`${scheduledHrs}h`} />
          <Row label="Rate" value={`${formatCurrency(s.pay_rate)}/hr`} />
          {isCompleted && actualHrs !== null ? (
            <>
              <Row label="Actual Hours" value={`${actualHrs}h`} highlight />
              <Row label="Actual Earnings" value={formatCurrency(actualHrs * s.pay_rate)} highlight last />
            </>
          ) : (
            <Row label="Est. Earnings" value={formatCurrency(scheduledHrs * s.pay_rate)} last />
          )}
        </View>

        <Text style={styles.groupLabel}>Site</Text>
        <View style={styles.group}>
          <Row label="Address" value={s.site?.address} />
          <Row label="Supervisor" value={s.site?.supervisor} last />
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <Button testID="navigate-btn" variant="secondary" label="Open in Maps"
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(s.site?.address || "")}`)} />
          <Button testID="call-supervisor" variant="secondary" label={`Call ${s.site?.supervisor}`}
            onPress={() => Linking.openURL(`tel:${s.site?.supervisor_phone}`)} />
        </View>

        <Text style={styles.groupLabel}>Site Instructions</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructions}>{s.site?.instructions || "No special instructions."}</Text>
        </View>

        {s.notes ? (
          <>
            <Text style={styles.groupLabel}>Manager Notes</Text>
            <View style={[styles.instructionsCard, styles.notesCard]}>
              <Ionicons name="information-circle-outline" size={16} color={C.accent} style={{ marginBottom: 4 }} />
              <Text style={styles.notesText}>{s.notes}</Text>
            </View>
          </>
        ) : null}

        {!s.instructions_acknowledged && s.status === "scheduled" ? (
          <View style={{ marginTop: 14 }}>
            <Button testID="ack-instructions" label={acking ? "…" : "Acknowledge Instructions"} onPress={ackInstructions} disabled={acking} />
          </View>
        ) : s.instructions_acknowledged ? (
          <View style={styles.ackedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={styles.ackedText}>Instructions acknowledged</Text>
          </View>
        ) : null}

        {s.status === "scheduled" && (
          <View style={{ marginTop: 20, gap: 10 }}>
            <Button testID="clock-in-shift" label="Go to Time Clock"
              onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: s.id } })} />
            <Button testID="request-swap-btn" variant="secondary" label="Request Shift Swap"
              onPress={() => router.push("/shift-swaps" as any)} />
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.completedText}>
              {actualHrs !== null ? `Clocked ${actualHrs}h — ${formatCurrency(actualHrs * s.pay_rate)} earned` : "Shift completed"}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last, highlight }: { label: string; value?: string | null; last?: boolean; highlight?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]} numberOfLines={2}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: "600", flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  hero: { paddingVertical: 20 },
  date: { color: C.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  time: { color: C.text, fontSize: 26, fontWeight: "600", marginTop: 4, letterSpacing: -0.3 },
  site: { color: C.text, fontSize: 17, marginTop: 10 },
  role: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  groupLabel: { color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  group: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  rowLabel: { color: C.text, fontSize: 15 },
  rowValue: { color: C.textSecondary, fontSize: 14, maxWidth: "60%", textAlign: "right" },
  rowValueHighlight: { color: "#22C55E", fontWeight: "600" },
  instructionsCard: { backgroundColor: C.card, borderRadius: 14, padding: 16 },
  notesCard: { borderLeftWidth: 3, borderLeftColor: C.accent },
  instructions: { color: C.text, fontSize: 14, lineHeight: 21 },
  notesText: { color: C.text, fontSize: 14, lineHeight: 21 },
  ackedRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 16 },
  ackedText: { color: C.textSecondary, fontSize: 13 },
  completedBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 14, padding: 14, marginTop: 20 },
  completedText: { color: "#22C55E", fontSize: 14, fontWeight: "600" },
});
