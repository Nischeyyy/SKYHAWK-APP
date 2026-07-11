import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Chip } from "@/src/ui";
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

  // Group by date
  const grouped: Record<string, any[]> = {};
  (data?.shifts || []).forEach((s: any) => {
    const day = new Date(s.start).toDateString();
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(s);
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>MY SCHEDULE</Text>
        <View style={styles.chipsRow}>
          <Chip testID="range-week" label="Week" active={range === "week"} onPress={() => setRange("week")} />
          <Chip testID="range-month" label="Month" active={range === "month"} onPress={() => setRange("month")} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.brandPrimary} />}
        >
          {Object.keys(grouped).length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={theme.colors.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No shifts in this range</Text>
            </View>
          )}
          {Object.entries(grouped).map(([day, shifts]) => (
            <View key={day} style={{ marginBottom: theme.spacing.lg }}>
              <Text style={styles.dayLabel}>{formatDate(shifts[0].start)}</Text>
              {shifts.map((s: any) => (
                <Pressable
                  key={s.id}
                  testID={`shift-item-${s.id}`}
                  onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })}
                  style={styles.shiftCard}
                >
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{formatShiftTime(s.start).replace(/\s/g, "")}</Text>
                    <Text style={styles.timeDivider}>→</Text>
                    <Text style={styles.timeText}>{formatShiftTime(s.end).replace(/\s/g, "")}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftRole}>{s.role}</Text>
                    <Text style={styles.siteName}>{s.site?.name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: s.status === "completed" ? theme.colors.success : theme.colors.brandPrimary }]} />
                      <Text style={styles.statusText}>{s.status}</Text>
                      {s.instructions_acknowledged && (
                        <>
                          <Text style={styles.dot}>·</Text>
                          <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                          <Text style={styles.statusText}>ack'd</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
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
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800", marginBottom: theme.spacing.md },
  chipsRow: { flexDirection: "row", gap: 8 },
  dayLabel: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: theme.spacing.sm },
  shiftCard: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  timeBadge: {
    backgroundColor: theme.colors.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: theme.radius.sm, alignItems: "center", minWidth: 70,
  },
  timeText: { color: theme.colors.onSurface, fontSize: 11, fontWeight: "700" },
  timeDivider: { color: theme.colors.onSurfaceTertiary, fontSize: 10, marginVertical: 1 },
  shiftRole: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "700" },
  siteName: { color: theme.colors.onSurfaceSecondary, fontSize: 13, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: theme.colors.onSurfaceTertiary, fontSize: 11, textTransform: "capitalize" },
  dot: { color: theme.colors.onSurfaceTertiary, marginHorizontal: 2 },
  empty: { alignItems: "center", padding: theme.spacing.xxxl },
  emptyText: { color: theme.colors.onSurfaceTertiary, marginTop: theme.spacing.md, fontSize: 14 },
});
