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

  if (loading || !s) return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;
  const hrs = hoursBetween(s.start, s.end);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Shift Details</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.date}>{formatDate(s.start)}</Text>
          <Text style={styles.time}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
          <Text style={styles.site}>{s.site?.name}</Text>
          <Text style={styles.role}>{s.role}</Text>
        </View>

        <Text style={styles.groupLabel}>Details</Text>
        <View style={styles.group}>
          <Row label="Hours" value={`${hrs}h`} />
          <Row label="Rate" value={`${formatCurrency(s.pay_rate)}/hr`} />
          <Row label="Est. Earnings" value={formatCurrency(hrs * s.pay_rate)} last />
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
          <Text style={styles.instructions}>{s.site?.instructions}</Text>
        </View>

        {!s.instructions_acknowledged ? (
          <View style={{ marginTop: 14 }}>
            <Button testID="ack-instructions" label={acking ? "…" : "Acknowledge Instructions"} onPress={ackInstructions} disabled={acking} />
          </View>
        ) : (
          <Text style={styles.ackedText}>✓ Instructions acknowledged</Text>
        )}

        {s.status === "scheduled" && (
          <View style={{ marginTop: 20, gap: 10 }}>
            <Button testID="clock-in-shift" label="Go to Time Clock"
              onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: s.id } })} />
            <Button testID="request-swap-btn" variant="secondary" label="Request Shift Swap"
              onPress={() => router.push("/shift-swaps" as any)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: any) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  hero: { paddingVertical: 20 },
  date: { color: theme.colors.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  time: { color: theme.colors.text, fontSize: 26, fontWeight: "600", marginTop: 4, letterSpacing: -0.3 },
  site: { color: theme.colors.text, fontSize: 17, marginTop: 10 },
  role: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 2 },
  groupLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  group: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowLabel: { color: theme.colors.text, fontSize: 15 },
  rowValue: { color: theme.colors.textSecondary, fontSize: 14, maxWidth: "60%", textAlign: "right" },
  instructionsCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 16 },
  instructions: { color: theme.colors.text, fontSize: 14, lineHeight: 21 },
  ackedText: { color: theme.colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 16 },
});
