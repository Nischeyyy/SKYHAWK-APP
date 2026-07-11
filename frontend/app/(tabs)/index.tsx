import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Card, Logo } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { formatShiftTime, formatDate, relativeTime } from "@/src/utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const todayShift = data?.today_shift;
  const nextShift = data?.next_shift;
  const activeClock = data?.active_clock;
  const licenceDays = data?.licence_days_remaining;
  const licenceExpiring = licenceDays !== null && licenceDays <= 60;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brandPrimary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Logo size={40} />
            <View>
              <Text style={styles.hello}>DUTY BRIEFING</Text>
              <Text style={styles.name}>{user?.full_name.split(" ")[0]}</Text>
            </View>
          </View>
          <Pressable testID="announcements-btn" onPress={() => router.push("/announcements")} style={styles.bellBtn} hitSlop={12}>
            <Ionicons name="notifications" size={20} color={theme.colors.onSurface} />
            {data?.unread_announcements > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.unread_announcements}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Active clock banner */}
        {activeClock && (
          <Pressable testID="active-clock-banner" onPress={() => router.push("/timeclock")} style={styles.activeBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.livePulse} />
              <Text style={styles.activeBannerLabel}>CLOCKED IN</Text>
            </View>
            <Text style={styles.activeBannerTime}>{formatShiftTime(activeClock.clock_in)}</Text>
          </Pressable>
        )}

        {/* Today's Shift */}
        {todayShift ? (
          <Card style={{ marginTop: theme.spacing.lg }} testID="today-shift-card">
            <Text style={styles.sectionLabel}>TODAY'S SHIFT</Text>
            <Text style={styles.bigTime}>
              {formatShiftTime(todayShift.start)} — {formatShiftTime(todayShift.end)}
            </Text>
            <Text style={styles.shiftRole}>{todayShift.role}</Text>
            <View style={styles.siteRow}>
              <Ionicons name="location" size={14} color={theme.colors.brandPrimary} />
              <Text style={styles.siteText}>{todayShift.site?.name}</Text>
            </View>
            <Text style={styles.addressText}>{todayShift.site?.address}</Text>
            <View style={styles.actionsRow}>
              <Pressable
                testID="clock-in-btn"
                onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: todayShift.id } })}
                style={[styles.primaryCta, { flex: 1 }]}
              >
                <Ionicons name={activeClock ? "stop-circle" : "play"} size={16} color={theme.colors.onBrandPrimary} />
                <Text style={styles.primaryCtaText}>{activeClock ? "CLOCK OUT" : "CLOCK IN"}</Text>
              </Pressable>
              <Pressable
                testID="navigate-btn"
                onPress={() => {
                  const q = encodeURIComponent(todayShift.site?.address || "");
                  Linking.openURL(Platform_openURL(q));
                }}
                style={styles.iconBtn}
              >
                <Ionicons name="navigate" size={18} color={theme.colors.onSurface} />
              </Pressable>
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: theme.spacing.lg }} testID="no-shift-card">
            <Text style={styles.sectionLabel}>TODAY</Text>
            <Text style={styles.emptyTitle}>No shift scheduled</Text>
            <Text style={styles.emptyText}>Browse open shifts to pick up work.</Text>
            <Pressable testID="browse-shifts-btn" onPress={() => router.push("/(tabs)/shifts")}
              style={[styles.primaryCta, { marginTop: theme.spacing.md }]}>
              <Text style={styles.primaryCtaText}>BROWSE OPEN SHIFTS</Text>
            </Pressable>
          </Card>
        )}

        {/* Next Shift */}
        {nextShift && (
          <Card style={{ marginTop: theme.spacing.md }} testID="next-shift-card">
            <Text style={styles.sectionLabel}>NEXT SCHEDULED</Text>
            <Text style={styles.nextDate}>{formatDate(nextShift.start)} · {formatShiftTime(nextShift.start)}</Text>
            <Text style={styles.siteText}>{nextShift.site?.name} · {nextShift.role}</Text>
          </Card>
        )}

        {/* Licence Expiry Alert */}
        {licenceExpiring && (
          <Pressable
            testID="licence-alert-card"
            onPress={() => router.push("/(tabs)/wallet")}
            style={styles.alertCard}
          >
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Licence expires in {licenceDays} days</Text>
              <Text style={styles.alertText}>Renew your Ontario Security Guard Licence.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.quickGrid}>
          <QuickAction icon="cash" label="Payroll" onPress={() => router.push("/payroll")} status={data?.latest_payroll?.status} testID="quick-payroll" />
          <QuickAction icon="megaphone" label="Announcements" onPress={() => router.push("/announcements")} badge={data?.unread_announcements} testID="quick-announcements" />
          <QuickAction icon="warning" label="Report Incident" onPress={() => router.push("/incidents")} testID="quick-incident" />
          <QuickAction icon="school" label="Onboarding" onPress={() => router.push("/onboarding")} testID="quick-onboarding" />
        </View>

        {/* Emergency Contacts */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }]}>
          EMERGENCY CONTACTS
        </Text>
        {(data?.emergency_contacts || []).filter((c: any) => c.phone).map((c: any, i: number) => (
          <Pressable
            key={i}
            testID={`emergency-contact-${i}`}
            onPress={() => Linking.openURL(`tel:${c.phone}`)}
            style={styles.contactRow}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call" size={16} color={theme.colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactPhone}>{c.phone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Platform_openURL(q: string) {
  return `https://maps.google.com/?q=${q}`;
}

function QuickAction({ icon, label, onPress, badge, status, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.quickBtn}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.brandPrimary} />
        {badge > 0 && (
          <View style={styles.qbBadge}>
            <Text style={styles.qbBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      {status && <Text style={styles.quickStatus}>{status.replace("_", " ")}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: theme.spacing.md, marginBottom: theme.spacing.sm,
  },
  hello: { color: theme.colors.brandPrimary, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  name: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 2 },
  bellBtn: { padding: 10, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.pill },
  badge: {
    position: "absolute", top: 4, right: 4, backgroundColor: theme.colors.error,
    borderRadius: 10, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  activeBanner: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: theme.colors.brandTertiary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.brandPrimary,
    marginBottom: theme.spacing.md,
  },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brandPrimary },
  activeBannerLabel: { color: theme.colors.onBrandTertiary, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  activeBannerTime: { color: theme.colors.brandPrimary, fontSize: 16, fontWeight: "800" },
  sectionLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  bigTime: { color: theme.colors.onSurface, fontSize: 32, fontWeight: "900", marginTop: 6, letterSpacing: -1 },
  shiftRole: { color: theme.colors.brandPrimary, fontSize: 14, fontWeight: "700", marginTop: 2 },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: theme.spacing.md },
  siteText: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "600" },
  addressText: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  primaryCta: {
    backgroundColor: theme.colors.brandPrimary, padding: 14, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  primaryCtaText: { color: theme.colors.onBrandPrimary, fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  iconBtn: {
    backgroundColor: theme.colors.surfaceTertiary, width: 48, height: 48,
    borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: theme.colors.onSurface, fontSize: 18, fontWeight: "700", marginTop: 6 },
  emptyText: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  nextDate: { color: theme.colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 6 },
  alertCard: {
    flexDirection: "row", gap: 10, alignItems: "center", padding: theme.spacing.md,
    backgroundColor: "rgba(245,158,11,0.1)", borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.warning, marginTop: theme.spacing.md,
  },
  alertTitle: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" },
  alertText: { color: theme.colors.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginTop: theme.spacing.lg },
  quickBtn: {
    width: "47.5%", backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 8, backgroundColor: theme.colors.brandTertiary,
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  qbBadge: {
    position: "absolute", top: -4, right: -4, backgroundColor: theme.colors.error,
    borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
  },
  qbBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  quickLabel: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 10 },
  quickStatus: { color: theme.colors.brandPrimary, fontSize: 11, marginTop: 3, textTransform: "capitalize", fontWeight: "600" },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border,
  },
  contactIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  contactName: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" },
  contactPhone: { color: theme.colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
});
