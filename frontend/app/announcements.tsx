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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Announcements</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {items.length === 0 && <Text style={styles.empty}>No announcements</Text>}
          {items.map((a, i) => (
            <View key={a.id} testID={`ann-${a.id}`} style={[styles.item, i < items.length - 1 && styles.itemBorder]}>
              <View style={styles.metaRow}>
                {!a.read && <View style={styles.unreadDot} />}
                <Text style={styles.postedBy}>{a.posted_by}</Text>
                <Text style={styles.time}>· {relativeTime(a.posted_at)}</Text>
                {a.severity === "critical" && <Text style={styles.critical}>Critical</Text>}
              </View>
              <Text style={styles.annTitle}>{a.title}</Text>
              <Text style={styles.annBody}>{a.body}</Text>
              <View style={styles.footer}>
                <Text style={styles.readCount}>{a.read_count} read</Text>
                {!a.read ? (
                  <Pressable testID={`ack-${a.id}`} onPress={() => ack(a.id)} hitSlop={8}>
                    <Text style={styles.ackText}>Mark as Read</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.readBadge}>✓ Read</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  item: { paddingVertical: 18 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.text },
  postedBy: { color: theme.colors.textSecondary, fontSize: 13 },
  time: { color: theme.colors.textSecondary, fontSize: 13 },
  critical: { color: theme.colors.error, fontSize: 12, marginLeft: 6, fontWeight: "600" },
  annTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600", marginTop: 8 },
  annBody: { color: theme.colors.text, fontSize: 15, marginTop: 6, lineHeight: 21 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  readCount: { color: theme.colors.textTertiary, fontSize: 13 },
  ackText: { color: theme.colors.text, fontSize: 14, fontWeight: "500" },
  readBadge: { color: theme.colors.textTertiary, fontSize: 13 },
  empty: { color: theme.colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
});
