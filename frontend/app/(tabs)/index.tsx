import React, { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { formatShiftTime, formatDate } from "@/src/utils/format";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const d = await api("/dashboard");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!loading) Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [loading, fade]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const today = data?.today_shift;
  const next = data?.next_shift;
  const activeClock = data?.active_clock;
  const firstName = user?.full_name.split(" ")[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade }}>
          <View style={styles.greetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetText}>{greeting()}</Text>
              <Text style={styles.nameText}>{firstName}</Text>
            </View>
            {data?.unread_announcements > 0 && (
              <Pressable
                testID="announcements-btn"
                onPress={() => router.push("/announcements")}
                style={styles.notifDot}
                hitSlop={16}
              >
                <View style={styles.dot} />
              </Pressable>
            )}
          </View>

          {today ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today</Text>
              <Text style={styles.timeRange}>
                {formatShiftTime(today.start)} – {formatShiftTime(today.end)}
              </Text>
              <Text style={styles.siteName}>{today.site?.name}</Text>
              <Text style={styles.roleText}>{today.role}</Text>

              <View style={styles.cta}>
                {activeClock ? (
                  <Button testID="clock-out-btn" label="Clock Out" variant="secondary" onPress={() => router.push("/timeclock")} />
                ) : (
                  <Button testID="clock-in-btn" label="Clock In" onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: today.id } })} />
                )}
                {activeClock && (
                  <Text style={styles.activeText}>On duty since {formatShiftTime(activeClock.clock_in)}</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today</Text>
              <Text style={styles.emptyText}>No shift scheduled</Text>
              <View style={styles.cta}>
                <Button testID="browse-shifts-btn" label="Browse Open Shifts" variant="secondary" onPress={() => router.push("/(tabs)/shifts")} />
              </View>
            </View>
          )}

          {next && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Upcoming</Text>
              <Pressable
                testID="next-shift-tap"
                onPress={() => router.push({ pathname: "/shift/[id]", params: { id: next.id } })}
              >
                <Text style={styles.upcomingSite}>{next.site?.name}</Text>
                <Text style={styles.upcomingMeta}>{formatDate(next.start)} · {formatShiftTime(next.start)} – {formatShiftTime(next.end)}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, paddingBottom: 60 },
  greetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 20,
    paddingBottom: 44,
  },
  greetText: { color: theme.colors.textSecondary, fontSize: 15 },
  nameText: { color: theme.colors.text, fontSize: 32, fontWeight: "700", marginTop: 2, letterSpacing: -0.5 },
  notifDot: { padding: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.text },
  section: { paddingBottom: 44 },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  timeRange: { color: theme.colors.text, fontSize: 22, fontWeight: "600", letterSpacing: -0.3 },
  siteName: { color: theme.colors.text, fontSize: 16, marginTop: 10 },
  roleText: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 2 },
  cta: { marginTop: 28 },
  activeText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 14, textAlign: "center" },
  emptyText: { color: theme.colors.textSecondary, fontSize: 16 },
  upcomingSite: { color: theme.colors.text, fontSize: 16 },
  upcomingMeta: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
});
