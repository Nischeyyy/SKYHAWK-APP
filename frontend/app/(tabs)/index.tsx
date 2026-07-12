import React, { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Animated, Linking, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import { Avatar } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { tap, warn as hapticWarn } from "@/src/utils/haptics";
import { light } from "@/src/theme/light";

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function shiftTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", " ");
}

function monthAbbrev(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function dayNumber(iso: string): string {
  return String(new Date(iso).getDate());
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [credential, setCredential] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [dash, schedule, wallet] = await Promise.all([
        api("/dashboard"),
        api("/schedule?range=month"),
        api("/wallet"),
      ]);
      setData(dash);
      const now = Date.now();
      const upcoming = (schedule.shifts || [])
        .filter((s: any) => new Date(s.start).getTime() > now && s.id !== dash?.today_shift?.id)
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 3);
      setUpcomingShifts(upcoming);
      const primaryCredential =
        (wallet.documents || []).find((d: any) => d.type === "security_licence") || (wallet.documents || [])[0] || null;
      setCredential(primaryCredential);
    } catch (e: any) {
      if (e.message !== 'SESSION_EXPIRED') setLoadError(e.message || 'Failed to load dashboard');
    }
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
        <ActivityIndicator color={light.textSecondary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: light.textSecondary, fontSize: 15, textAlign: 'center', marginBottom: 20 }}>
            {loadError}
          </Text>
          <Pressable onPress={load} style={{ backgroundColor: light.card, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: light.text, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const today = data?.today_shift;
  const activeClock = data?.active_clock;
  const firstName = user?.full_name?.split(" ")[0];
  const dispatchNumber = "+14165550000";

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={light.textSecondary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade }}>
          {/* Greeting + profile row */}
          <View style={styles.headerRow}>
            <View style={styles.greetBlock}>
              <Text style={styles.greetText}>{greetingLabel()}</Text>
              <Text style={styles.nameText}>{firstName}</Text>
            </View>
            <View style={styles.headerPill}>
              <Pressable
                testID="announcements-btn"
                onPress={() => { tap(); router.push("/announcements"); }}
                hitSlop={10}
                style={styles.bellBtn}
              >
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                {data?.unread_announcements > 0 && <View style={styles.bellDot} />}
              </Pressable>
              <Pressable testID="profile-avatar-btn" onPress={() => { tap(); router.push("/(tabs)/profile"); }}>
                <Avatar name={user?.full_name} size={40} />
              </Pressable>
            </View>
          </View>

          {/* Today's Assignment */}
          <Text style={styles.sectionLabel}>TODAY{"\u2019"}S ASSIGNMENT</Text>
          {today ? (
            <>
              <Pressable
                testID="today-assignment-card"
                onPress={() => router.push({ pathname: "/shift/[id]", params: { id: today.id } })}
                style={styles.assignCard}
              >
                <View style={styles.assignIconWrap}>
                  <Ionicons name="business-outline" size={22} color={light.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignSite}>{today.site?.name}</Text>
                  <Text style={styles.assignRole}>{today.role}</Text>
                  <View style={styles.assignTimeRow}>
                    <Ionicons name="time-outline" size={13} color={light.textSecondary} />
                    <Text style={styles.assignTime}>{shiftTime(today.start)} – {shiftTime(today.end)}</Text>
                  </View>
                </View>
                <View style={styles.assignRightCol}>
                  <View style={styles.upcomingPill}>
                    <View style={styles.upcomingDot} />
                    <Text style={styles.upcomingPillText}>Upcoming</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={light.textTertiary} style={{ marginTop: 14 }} />
                </View>
              </Pressable>

              <Pressable
                testID={activeClock ? "clock-out-btn" : "clock-in-btn"}
                onPress={() => router.push({ pathname: "/timeclock", params: { shift_id: today.id } })}
                style={styles.clockInBtn}
              >
                <Ionicons name="scan-outline" size={20} color="#fff" />
                <Text style={styles.clockInText}>{activeClock ? "Clocked In · Manage" : "Clock In"}</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.assignCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignSite}>No shift scheduled</Text>
                <Text style={styles.assignRole}>Browse the marketplace to pick up open shifts.</Text>
              </View>
              <Pressable testID="browse-shifts-btn" onPress={() => router.push("/(tabs)/shifts")}>
                <Ionicons name="chevron-forward" size={18} color={light.textTertiary} />
              </Pressable>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <QuickAction
              testID="sos-btn"
              label="Emergency"
              sub="Need immediate help"
              danger
              onPress={() => { tap(); setSosOpen(true); }}
              icon={<Ionicons name="shield-outline" size={24} color="#fff" />}
            />
            <QuickAction
              testID="call-dispatch-btn"
              label="Dispatch"
              sub="Call dispatch"
              tone="green"
              onPress={() => { tap(); Linking.openURL(`tel:${dispatchNumber}`); }}
              icon={<Ionicons name="radio-outline" size={24} color="#fff" />}
            />
            <QuickAction
              testID="create-report-btn"
              label="Report"
              sub="Submit a report"
              onPress={() => { tap(); router.push("/incidents"); }}
              icon={<Ionicons name="document-text-outline" size={24} color={light.text} />}
            />
          </View>

          {/* Upcoming Shifts */}
          {upcomingShifts.length > 0 && (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.sectionLabel}>UPCOMING SHIFTS</Text>
                <Pressable testID="view-schedule-link" onPress={() => { tap(); router.push("/(tabs)/schedule"); }} style={styles.rowLink}>
                  <Text style={styles.linkText}>View Schedule</Text>
                  <Ionicons name="chevron-forward" size={14} color={light.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.listCard}>
                {upcomingShifts.map((s, i) => (
                  <Pressable
                    key={s.id}
                    testID={`upcoming-shift-${i}`}
                    onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })}
                    style={[styles.shiftRow, i < upcomingShifts.length - 1 && styles.rowDivider]}
                  >
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeMonth}>{monthAbbrev(s.start)}</Text>
                      <Text style={styles.dateBadgeDay}>{dayNumber(s.start)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftSite}>{s.site?.name}</Text>
                      <Text style={styles.shiftRole}>{s.role}</Text>
                      <Text style={styles.shiftTime}>{shiftTime(s.start)} – {shiftTime(s.end)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <View style={styles.scheduledPill}>
                        <Text style={styles.scheduledPillText}>Scheduled</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={light.textTertiary} style={{ marginTop: 10 }} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Credentials */}
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <Text style={styles.sectionLabel}>CREDENTIALS</Text>
              <Pressable testID="view-credentials-link" onPress={() => { tap(); router.push("/wallet"); }} style={styles.rowLink}>
                <Text style={styles.linkText}>View All</Text>
                <Ionicons name="chevron-forward" size={14} color={light.textSecondary} />
              </Pressable>
            </View>
            {credential ? (
              <Pressable testID="credential-card" onPress={() => { tap(); router.push("/wallet"); }} style={styles.listCard}>
                <View style={styles.credRow}>
                  <View style={styles.credIconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={light.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.credName}>{credential.name}</Text>
                    <Text style={styles.credNumber}>{credential.number}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.credExpiry}>
                      Expires {new Date(credential.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={light.textTertiary} style={{ marginTop: 10 }} />
                  </View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.listCard}>
                <Text style={styles.credNumber}>No credentials on file</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* SOS Modal */}
      <Modal visible={sosOpen} transparent animationType="fade" onRequestClose={() => setSosOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard} testID="sos-modal">
            <Ionicons name="alert-circle" size={44} color={light.accentRed} style={{ alignSelf: "center" }} />
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

function QuickAction({ icon, label, sub, onPress, danger, tone, testID }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const green = tone === "green";
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        style={[
          styles.actionCard,
          danger && styles.actionCardDanger,
          green && styles.actionCardGreenBase,
        ]}
      >
        {green && (
          <>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.actionCardGreenTint]} />
          </>
        )}
        {icon}
        <Text style={[styles.actionLabel, danger && styles.actionLabelDanger, green && styles.actionLabelGreen]}>{label}</Text>
        <Text style={[styles.actionSub, danger && styles.actionSubDanger, green && styles.actionSubGreen]}>{sub}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: light.bg },
  container: { paddingHorizontal: 20, paddingBottom: 140 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginBottom: 22 },
  greetBlock: { justifyContent: "center" },
  greetText: { color: light.textSecondary, fontSize: 14 },
  nameText: { color: light.text, fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },

  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#000000",
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 20,
    marginRight: -20,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  bellDot: { position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: 3.5, backgroundColor: light.accentRed },

  sectionLabel: { color: light.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },

  assignCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: light.cardBorder,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  assignIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: light.chip,
    alignItems: "center", justifyContent: "center",
  },
  assignSite: { color: light.text, fontSize: 16, fontWeight: "700" },
  assignRole: { color: light.textSecondary, fontSize: 13, marginTop: 2 },
  assignTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  assignTime: { color: light.textSecondary, fontSize: 13 },
  assignRightCol: { alignItems: "flex-end" },
  upcomingPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  upcomingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: light.accentRed },
  upcomingPillText: { color: light.accentRed, fontSize: 12, fontWeight: "600" },

  clockInBtn: {
    marginTop: 14,
    backgroundColor: light.black,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  clockInText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 22, alignItems: "stretch" },
  actionCard: {
    flex: 1,
    backgroundColor: light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: light.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardDanger: {
    backgroundColor: light.accentRed,
    borderColor: light.accentRed,
    shadowColor: light.accentRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionCardGreenBase: {
    backgroundColor: "#2FAE59",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#1E7A3E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardGreenTint: {
    backgroundColor: "rgba(47,174,89,0.55)",
  },
  actionLabel: { color: light.text, fontSize: 13, fontWeight: "700", marginTop: 8 },
  actionLabelDanger: { color: "#fff" },
  actionLabelGreen: { color: "#fff" },
  actionSub: { color: light.textSecondary, fontSize: 10, marginTop: 2, textAlign: "center" },
  actionSubDanger: { color: "rgba(255,255,255,0.65)" },
  actionSubGreen: { color: "rgba(255,255,255,0.65)" },

  block: { marginTop: 30 },
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  rowLink: { flexDirection: "row", alignItems: "center", gap: 3 },
  linkText: { color: light.textSecondary, fontSize: 13, fontWeight: "500" },

  listCard: {
    backgroundColor: light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: light.cardBorder,
    overflow: "hidden",
  },
  shiftRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: light.cardBorder },
  dateBadge: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: light.cardBorder,
    alignItems: "center", justifyContent: "center", backgroundColor: light.chip,
  },
  dateBadgeMonth: { color: light.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  dateBadgeDay: { color: light.text, fontSize: 17, fontWeight: "800", marginTop: 1 },
  shiftSite: { color: light.text, fontSize: 15, fontWeight: "700" },
  shiftRole: { color: light.textSecondary, fontSize: 12, marginTop: 1 },
  shiftTime: { color: light.textSecondary, fontSize: 12, marginTop: 3 },
  scheduledPill: { backgroundColor: light.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  scheduledPillText: { color: light.textSecondary, fontSize: 11, fontWeight: "600" },

  credRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  credIconWrap: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: light.cardBorder,
    alignItems: "center", justifyContent: "center", backgroundColor: light.chip,
  },
  credName: { color: light.text, fontSize: 14, fontWeight: "700" },
  credNumber: { color: light.textSecondary, fontSize: 12, marginTop: 2 },
  credExpiry: { color: light.accentRed, fontSize: 12, fontWeight: "600" },

  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", paddingHorizontal: 32 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: light.cardBorder },
  sosModalTitle: { color: light.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 10 },
  sosModalBody: { color: light.textSecondary, fontSize: 14, marginTop: 10, textAlign: "center", lineHeight: 20 },
  sosConfirm: { backgroundColor: light.accentRed, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  sosConfirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sosCancel: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  sosCancelText: { color: light.text, fontSize: 16, fontWeight: "500" },
});
