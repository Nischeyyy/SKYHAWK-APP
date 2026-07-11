import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime, formatDate } from "@/src/utils/format";

export default function Schedule() {
  const router = useRouter();
  const [range, setRange] = useState<"week" | "month">("week");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api(`/schedule?range=${range}`);
      setData(d);
    } catch {}
    setLoading(false);
  }, [range]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped: Record<string, any[]> = {};
  (data?.shifts || []).forEach((s: any) => {
    const day = new Date(s.start).toDateString();
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(s);
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <View style={styles.segmented}>
          <Pressable
            testID="range-week"
            onPress={() => setRange("week")}
            style={[styles.segBtn, range === "week" && styles.segActive]}
          >
            <Text style={[styles.segText, range === "week" && styles.segTextActive]}>Week</Text>
          </Pressable>
          <Pressable
            testID="range-month"
            onPress={() => setRange("month")}
            style={[styles.segBtn, range === "month" && styles.segActive]}
          >
            <Text style={[styles.segText, range === "month" && styles.segTextActive]}>Month</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.textSecondary} />}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(grouped).length === 0 && (
            <Text style={styles.empty}>No shifts in this range</Text>
          )}
          {Object.entries(grouped).map(([day, shifts]) => (
            <View key={day} style={styles.dayGroup}>
              <Text style={styles.dayLabel}>{formatDate(shifts[0].start)}</Text>
              {shifts.map((s: any, i: number) => (
                <Pressable
                  key={s.id}
                  testID={`shift-item-${s.id}`}
                  onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })}
                  style={[styles.shiftRow, i < shifts.length - 1 && styles.shiftRowBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftTime}>{formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
                    <Text style={styles.shiftSite}>{s.site?.name}</Text>
                    <Text style={styles.shiftRole}>{s.role}</Text>
                  </View>
                  {s.status === "completed" ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.verified} testID={`completed-${s.id}`} />
                  ) : s.instructions_acknowledged ? (
                    <StatusPill label="Ready" tone="accent" />
                  ) : (
                    <StatusPill label="Pending Ack" tone="warning" />
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 14 },
  segmented: { flexDirection: "row", backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: theme.radius.sm },
  segActive: { backgroundColor: theme.colors.cardAlt },
  segText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  segTextActive: { color: theme.colors.text },
  dayGroup: { marginTop: 22 },
  dayLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  shiftRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  shiftRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  shiftTime: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  shiftSite: { color: theme.colors.text, fontSize: 15, marginTop: 4 },
  shiftRole: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  completedText: { color: theme.colors.textTertiary, fontSize: 12 },
  empty: { color: theme.colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
});
