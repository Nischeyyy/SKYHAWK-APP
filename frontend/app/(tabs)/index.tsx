import React, { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Animated, Linking, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { theme } from "@/src/theme";
import { Button, StatusPill, ShieldMark } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { formatShiftTime, formatDate } from "@/src/utils/format";
import { tap, warn as hapticWarn } from "@/src/utils/haptics";

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function liveShiftStatus(shift: any, activeClock: any): { label: string; tone: "neutral" | "verified" | "warning" | "accent" } | null {
  if (!shift) return null;
  if (activeClock) return { label: "Clocked in", tone: "verified" };
  const now = Date.now();
  const start = new Date(shift.start).getTime();
  const end = new Date(shift.end).getTime();
  if (now > end) return { label: "Ended", tone: "neutral" };
  if (now >= start) return { label: "In progress · Not clocked in", tone: "warning" };
  const diffMin = Math.round((start - now) / 60000);
  if (diffMin <= 15) return { label: `Starts in ${diffMin}m · Clock in available`, tone: "accent" };
  if (diffMin < 60) return { label: `Starts in ${diffMin}m`, tone: "accent" };
  const hrs = Math.floor(diffMin / 60);
  const mm = diffMin % 60;
  return { label: mm > 0 ? `Starts in ${hrs}h ${mm}m` : `Starts in ${hrs}h`, tone: "accent" };
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
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

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

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
  const dispatchNumber = "+14165550000";
  const shiftStatus = liveShiftStatus(today, activeClock);
  // Compute clock-in availability (15 min before start)
  const canClockIn = today
    ? now >= new Date(today.start).getTime() - 15 * 60 * 1000 && now <= new Date(today.end).getTime()
    : false;

  const triggerSos = async () => {
    setSosSubmitting(true);
    try {
      hapticWarn();
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const p = await Location.requestForegroundPermissionsAsync();
        if (p.status === "granted") {
          const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = l.coords.latitude;
          lng = l.coords.longitude;
        }
      } catch {}
      try {
        await api("/incidents", {
          method: "POST",
          body: {
            type: "sos",
            severity: "critical",
            description: `Emergency SOS triggered by guard${lat && lng ? ` at ${lat.toFixed(4)}, ${lng.toFixed(4)}` : ""}.`,
            site_id: today?.site_id,
          },
        });
      } catch {}
      Linking.openURL(`tel:${dispatchNumber}`);
    } finally {
      setSosSubmitting(false);
      setSosOpen(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade }}>
          {/* Greet header */}
          <View style={styles.greetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <ShieldMark size={16} />
              <Text style={styles.greetText}>{greetingLabel()}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.nameText}>{firstName}</Text>
              {data?.unread_announcements > 0 && (
                <Pressable
                  testID="announcements-btn"
                  onPress={() => { tap(); router.push("/announcements"); }}
                  hitSlop={12}
                  style={styles.notifBtn}
                >
                  <View style={styles.dot} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Today's Shift */}
          {today ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Today{"\u2019"}s Shift</Text>
                {shiftStatus && <StatusPill label={shiftStatus.label} tone={shiftStatus.tone} testID="shift-status-pill" />}
              </View>
              <Text style={styles.timeRange}>
                {formatShiftTime(today.start)} – {formatShiftTime(today.end)}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{today.site?.name}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaSubtext}>{today.role}</Text>
              </View>

              <View style={styles.cta}>
                {activeClock ? (
                  <Button
                    testID="clock-out-btn"
                    label="Clocked In · Tap to Manage"
                    variant="secondary"
                    onPress={() => router.push("/timeclock")}
                    leading={<Ionicons name="checkmark-circle" size={16} color={theme.colors.verified} />}
                  />
                ) : (
                  <Button
                    testID="clock-in-btn"
                    label={canClockIn ? "Clock In" : "Clock In (Available soon)"}
                    disabled={!canClockIn}
                    onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: today.id } })}
                  />
                )}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today{"\u2019"}s Shift</Text>
              <Text style={styles.emptyTitle}>No shift scheduled</Text>
              <Text style={styles.emptyBody}>Browse the marketplace to pick up open shifts.</Text>
              <View style={styles.cta}>
                <Button testID="browse-shifts-btn" label="Browse Open Shifts" variant="secondary" onPress={() => router.push("/(tabs)/shifts")} />
              </View>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <ActionButton
              testID="sos-btn"
              label="SOS"
              danger
              onPress={() => { tap(); setSosOpen(true); }}
              icon={<Text style={styles.sosText}>SOS</Text>}
            />
            <ActionButton
              testID="call-dispatch-btn"
              label="Dispatch"
              onPress={() => { tap(); Linking.openURL(`tel:${dispatchNumber}`); }}
              icon={<Ionicons name="call" size={24} color={theme.colors.accent} />}
            />
            <ActionButton
              testID="create-report-btn"
              label="Report"
              onPress={() => { tap(); router.push("/incidents"); }}
              icon={<Ionicons name="document-text" size={24} color={theme.colors.accent} />}
            />
          </View>

          {/* Upcoming */}
          {next && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Upcoming</Text>
              <Pressable
                testID="next-shift-tap"
                onPress={() => router.push({ pathname: "/shift/[id]", params: { id: next.id } })}
              >
                <Text style={styles.upcomingSite}>{next.site?.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.upcomingMeta}>{formatDate(next.start)} · {formatShiftTime(next.start)} – {formatShiftTime(next.end)}</Text>
                </View>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* SOS Modal */}
      <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard} testID="sos-modal">
            <Ionicons name="alert-circle" size={44} color={theme.colors.danger} style={{ alignSelf: "center" }} />
            <Text style={styles.sosModalTitle}>Emergency SOS</Text>
            <Text style={styles.sosModalBody}>
              This will alert dispatch, share your location, and place a call to the emergency line.
            </Text>
            <View style={{ height: 22 }} />
            <Pressable testID="sos-confirm-btn" onPress={triggerSos} disabled={sosSubmitting} style={styles.sosConfirm}>
              {sosSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sosConfirmText}>Send Emergency Alert</Text>}
            </Pressable>
            <Pressable testID="sos-cancel-btn" onPress={() => setSosOpen(false)} style={styles.sosCancel}>
              <Text style={styles.sosCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionButton({ icon, label, onPress, danger, testID }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <View style={styles.actionItem}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          testID={testID}
          onPress={onPress}
          onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
          style={[styles.actionCircle, danger && styles.actionCircleDanger]}
        >
          {icon}
        </Pressable>
      </Animated.View>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, paddingBottom: 140 },

  greetHeader: { paddingTop: 20, paddingBottom: 40 },
  greetText: { color: theme.colors.textSecondary, fontSize: 15 },
  nameText: { color: theme.colors.text, fontSize: 38, fontWeight: "700", marginTop: 2, letterSpacing: -0.6 },
  notifBtn: { padding: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },

  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  timeRange: { color: theme.colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { color: theme.colors.text, fontSize: 17, fontWeight: "500" },
  metaSubtext: { color: theme.colors.textSecondary, fontSize: 15 },
  emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "600", marginTop: 4 },
  emptyBody: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 6 },
  cta: { marginTop: 22 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  actionItem: { alignItems: "center", flex: 1 },
  actionCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleDanger: {
    backgroundColor: "rgba(255,69,58,0.10)",
    borderColor: theme.colors.danger,
  },
  actionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
  },
  actionLabelDanger: { color: theme.colors.danger, fontWeight: "600" },
  sosText: { color: theme.colors.danger, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },

  upcomingSite: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  upcomingMeta: { color: theme.colors.textSecondary, fontSize: 14 },

  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", paddingHorizontal: 32 },
  modalCard: { backgroundColor: theme.colors.cardElevated, borderRadius: 20, padding: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  sosModalTitle: { color: theme.colors.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  sosModalBody: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 10, textAlign: "center", lineHeight: 20 },
  sosConfirm: { backgroundColor: theme.colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  sosConfirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sosCancel: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  sosCancelText: { color: theme.colors.accent, fontSize: 16, fontWeight: "500" },
});
