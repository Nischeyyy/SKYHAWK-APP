import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { relativeTime } from "@/src/utils/format";

export default function Announcements() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api("/announcements");
      setItems(d.announcements);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ack = async (id: string) => {
    try {
      await api(`/announcements/${id}/acknowledge`, { method: "POST" });
      setItems((prev) => prev.map((a) => a.id === id ? { ...a, read: true, read_count: (a.read_count || 0) + 1 } : a));
    } catch {}
  };

  const sevColor = (s: string) =>
    s === "critical" ? theme.colors.error :
    s === "warning" ? theme.colors.warning : theme.colors.info;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>ANNOUNCEMENTS</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}>
          {items.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 }}>
              No announcements
            </Text>
          )}
          {items.map((a) => (
            <View key={a.id} testID={`ann-${a.id}`} style={[styles.card, !a.read && styles.cardUnread]}>
              <View style={styles.cardHead}>
                <View style={[styles.sevBadge, { backgroundColor: sevColor(a.severity) + "22", borderColor: sevColor(a.severity) }]}>
                  <Ionicons name={a.severity === "critical" ? "alert-circle" : a.severity === "warning" ? "warning" : "information-circle"}
                    size={12} color={sevColor(a.severity)} />
                  <Text style={[styles.sevText, { color: sevColor(a.severity) }]}>{a.severity.toUpperCase()}</Text>
                </View>
                <Text style={styles.time}>{relativeTime(a.posted_at)}</Text>
              </View>
              <Text style={styles.annTitle}>{a.title}</Text>
              <Text style={styles.annBody}>{a.body}</Text>
              <View style={styles.footerRow}>
                <Text style={styles.postedBy}>{a.posted_by}</Text>
                <Text style={styles.readCount}>{a.read_count} read</Text>
              </View>
              {!a.read && (
                <Pressable testID={`ack-${a.id}`} onPress={() => ack(a.id)} style={styles.ackBtn}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.onBrandPrimary} />
                  <Text style={styles.ackText}>ACKNOWLEDGE</Text>
                </Pressable>
              )}
              {a.read && (
                <View style={styles.readBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                  <Text style={styles.readText}>Acknowledged</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  card: {
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.lg,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardUnread: { borderColor: theme.colors.brandPrimary, borderLeftWidth: 3 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sevBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1,
  },
  sevText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  time: { color: theme.colors.onSurfaceTertiary, fontSize: 11 },
  annTitle: { color: theme.colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: theme.spacing.sm },
  annBody: { color: theme.colors.onSurfaceSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  postedBy: { color: theme.colors.onSurfaceTertiary, fontSize: 11 },
  readCount: { color: theme.colors.onSurfaceTertiary, fontSize: 11 },
  ackBtn: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.brandPrimary,
    padding: 12, borderRadius: theme.radius.md, flexDirection: "row",
    justifyContent: "center", alignItems: "center", gap: 6,
  },
  ackText: { color: theme.colors.onBrandPrimary, fontWeight: "800", letterSpacing: 1 },
  readBadge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: theme.spacing.md },
  readText: { color: theme.colors.success, fontSize: 12, fontWeight: "600" },
});
