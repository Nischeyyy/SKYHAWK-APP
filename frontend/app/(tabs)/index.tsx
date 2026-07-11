import React, { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Animated, Linking, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
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
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
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
  const dispatchNumber = "+14165550000";

  const triggerSos = async () => {
    setSosSubmitting(true);
    try {
      if (typeof Haptics.notificationAsync === "function") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
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

          {/* Quick actions — SOS is red (the sole exception) */}
          <View style={styles.actionsRow}>
            <ActionButton
              testID="sos-btn"
              label="SOS"
              danger
              onPress={() => {
                if (typeof Haptics.selectionAsync === "function") Haptics.selectionAsync();
                setSosOpen(true);
              }}
              icon={
                <Text style={styles.sosText}>SOS</Text>
              }
            />
            <ActionButton
              testID="call-dispatch-btn"
              label="Dispatch"
              onPress={() => {
                if (typeof Haptics.selectionAsync === "function") Haptics.selectionAsync();
                Linking.openURL(`tel:${dispatchNumber}`);
              }}
              icon={<Ionicons name="call-outline" size={22} color={theme.colors.text} />}
            />
            <ActionButton
              testID="create-report-btn"
              label="Report"
              onPress={() => {
                if (typeof Haptics.selectionAsync === "function") Haptics.selectionAsync();
                router.push("/incidents");
              }}
              icon={<Ionicons name="document-text-outline" size={22} color={theme.colors.text} />}
            />
          </View>

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

      <Modal
        visible={sosOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSosOpen(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard} testID="sos-modal">
            <Text style={styles.sosModalTitle}>Emergency SOS</Text>
            <Text style={styles.sosModalBody}>
              This will alert dispatch, share your location, and place a call to the emergency line.
            </Text>
            <View style={{ height: 22 }} />
            <Pressable
              testID="sos-confirm-btn"
              onPress={triggerSos}
              disabled={sosSubmitting}
              style={styles.sosConfirm}
            >
              {sosSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sosConfirmText}>Send Emergency Alert</Text>
              )}
            </Pressable>
            <Pressable
              testID="sos-cancel-btn"
              onPress={() => setSosOpen(false)}
              style={styles.sosCancel}
            >
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
          onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start()}
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
  container: { paddingHorizontal: 24, paddingBottom: 120 },
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

  // Quick actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 44,
    paddingHorizontal: 8,
  },
  actionItem: { alignItems: "center", flex: 1 },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleDanger: {
    backgroundColor: "#1F0A0A",
    borderWidth: 1,
    borderColor: "#FF453A",
  },
  actionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  actionLabelDanger: { color: "#FF453A" },
  sosText: {
    color: "#FF453A",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // SOS Modal
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 22,
  },
  sosModalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  sosModalBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  sosConfirm: {
    backgroundColor: "#FF453A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sosConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sosCancel: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  sosCancelText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
});
