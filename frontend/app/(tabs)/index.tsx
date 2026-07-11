import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Linking, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

  const load = useCallback(async () => {
    try {
      const d = await api("/dashboard");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        {/* Greeting */}
        <View style={styles.greetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetText}>{greeting()}</Text>
            <Text style={styles.nameText}>{firstName}</Text>
          </View>
          <Pressable testID="announcements-btn" onPress={() => router.push("/announcements")} hitSlop={12}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
            {data?.unread_announcements > 0 && <View style={styles.dot} />}
          </Pressable>
        </View>

        {/* Today */}
        {today ? (
          <View style={styles.todayBlock}>
            <Text style={styles.sectionTitle}>Today</Text>
            <Text style={styles.timeRange}>
              {formatShiftTime(today.start)} – {formatShiftTime(today.end)}
            </Text>
            <Text style={styles.siteName}>{today.site?.name}</Text>
            <Text style={styles.roleText}>{today.role}</Text>

            <View style={{ marginTop: theme.spacing.xxl }}>
              {activeClock ? (
                <Button
                  testID="clock-out-btn"
                  label="Clock Out"
                  variant="secondary"
                  onPress={() => router.push("/timeclock")}
                />
              ) : (
                <Button
                  testID="clock-in-btn"
                  label="Clock In"
                  onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: today.id } })}
                />
              )}
            </View>

            {activeClock && (
              <Text style={styles.activeText}>On duty since {formatShiftTime(activeClock.clock_in)}</Text>
            )}
          </View>
        ) : (
          <View style={styles.todayBlock}>
            <Text style={styles.sectionTitle}>Today</Text>
            <Text style={styles.emptyText}>No shift scheduled</Text>
            <View style={{ marginTop: theme.spacing.xl }}>
              <Button
                testID="browse-shifts-btn"
                label="Browse Open Shifts"
                variant="secondary"
                onPress={() => router.push("/(tabs)/shifts")}
              />
            </View>
          </View>
        )}

        {/* Upcoming */}
        {next && (
          <View style={styles.upcomingBlock}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <Pressable
              testID="next-shift-tap"
              onPress={() => router.push({ pathname: "/shift/[id]", params: { id: next.id } })}
              style={styles.upcomingItem}
            >
              <Text style={styles.upcomingDate}>{formatDate(next.start)}</Text>
              <Text style={styles.upcomingSite}>{next.site?.name}</Text>
              <Text style={styles.upcomingTime}>
                {formatShiftTime(next.start)} – {formatShiftTime(next.end)}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Announcements peek */}
        {data?.unread_announcements > 0 && (
          <Pressable
            testID="announcements-peek"
            onPress={() => router.push("/announcements")}
            style={styles.peekRow}
          >
            <Text style={styles.peekLabel}>
              {data.unread_announcements} new {data.unread_announcements === 1 ? "announcement" : "announcements"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        )}

        {/* Licence expiry — only if urgent */}
        {data?.licence_days_remaining !== null && data?.licence_days_remaining <= 60 && (
          <Pressable
            testID="licence-alert"
            onPress={() => router.push("/(tabs)/wallet")}
            style={styles.peekRow}
          >
            <Text style={styles.peekLabel}>Licence expires in {data.licence_days_remaining} days</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        )}

        {/* Minimal quick links */}
        <View style={styles.linkGroup}>
          <LinkRow icon="briefcase-outline" label="Report Incident" onPress={() => router.push("/incidents")} testID="link-incident" />
          <LinkRow icon="cash-outline" label="Payroll" value={data?.latest_payroll?.status?.replace("_", " ")} onPress={() => router.push("/payroll")} testID="link-payroll" />
          <LinkRow icon="school-outline" label="Onboarding" onPress={() => router.push("/onboarding")} testID="link-onboarding" last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({ icon, label, value, onPress, testID, last }: any) {
  const scale = React.useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={[styles.linkRow, !last && styles.linkRowBorder]}
      >
        <Ionicons name={icon} size={20} color={theme.colors.text} style={{ marginRight: 14 }} />
        <Text style={styles.linkText}>{label}</Text>
        {value && <Text style={styles.linkValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} style={{ marginLeft: 8 }} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 60 },
  greetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  greetText: { color: theme.colors.textSecondary, fontSize: 15 },
  nameText: { color: theme.colors.text, fontSize: 32, fontWeight: "700", marginTop: 2 },
  dot: {
    position: "absolute", top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.text,
  },
  todayBlock: { paddingVertical: theme.spacing.md },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  timeRange: { color: theme.colors.text, fontSize: 24, fontWeight: "600", letterSpacing: -0.3 },
  siteName: { color: theme.colors.text, fontSize: 17, marginTop: 8 },
  roleText: { color: theme.colors.textSecondary, fontSize: 15, marginTop: 2 },
  activeText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: theme.spacing.md, textAlign: "center" },
  emptyText: { color: theme.colors.textSecondary, fontSize: 17, marginTop: 4 },
  upcomingBlock: { paddingVertical: theme.spacing.lg, marginTop: theme.spacing.md },
  upcomingItem: { paddingVertical: theme.spacing.sm },
  upcomingDate: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  upcomingSite: { color: theme.colors.text, fontSize: 15, marginTop: 4 },
  upcomingTime: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 2 },
  peekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  peekLabel: { color: theme.colors.text, fontSize: 15 },
  linkGroup: { marginTop: theme.spacing.xxl },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  linkRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  linkText: { color: theme.colors.text, fontSize: 15, flex: 1 },
  linkValue: { color: theme.colors.textSecondary, fontSize: 14, textTransform: "capitalize" },
});
