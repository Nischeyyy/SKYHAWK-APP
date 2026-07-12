import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Avatar, StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";

const QUICK_ACTIONS = [
  {
    id: "emergency",
    icon: "shield-outline" as const,
    label: "Emergency",
    sub: "Get immediate help",
    color: "#E13B3B",
    bg: "rgba(225,59,59,0.10)",
    route: "/sos",
  },
  {
    id: "dispatch",
    icon: "radio-outline" as const,
    label: "Dispatch",
    sub: "Call dispatch",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
    route: null,
    phone: "+14165550100",
  },
  {
    id: "report",
    icon: "document-text-outline" as const,
    label: "Report",
    sub: "Submit a report",
    color: "#0B0B0C",
    bg: "rgba(0,0,0,0.06)",
    route: "/incidents",
  },
];

function QuickAction({ item, onPress }: { item: typeof QUICK_ACTIONS[0]; onPress: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.qaWrap, { transform: [{ scale }] }]}>
      <Pressable
        testID={`quick-${item.id}`}
        style={styles.qaBtn}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
      >
        <View style={[styles.qaIconWrap, { backgroundColor: item.bg }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <Text style={styles.qaLabel}>{item.label}</Text>
        <Text style={styles.qaSub}>{item.sub}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await api("/profile"); setData(d); } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;
  }

  const u = data?.user || user;
  const eq = data?.equipment || [];

  const handleQuickAction = (item: typeof QUICK_ACTIONS[0]) => {
    if (item.route) {
      router.push(item.route as any);
    } else if (item.phone) {
      Linking.openURL(`tel:${item.phone}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <Pressable testID="settings-btn" onPress={() => {}} style={styles.topBarIcon}>
          <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Avatar name={u?.full_name} size={84} testID="profile-avatar" />
            <View style={styles.avatarEditBtn}>
              <Ionicons name="camera-outline" size={14} color={theme.colors.textSecondary} />
            </View>
          </View>
          <Text style={styles.name}>{u?.full_name}</Text>
          <Text style={styles.handle}>@{(u?.full_name || "").toLowerCase().replace(" ", "")} · {u?.employment_status || "Full-Time"}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <StatusPill label={u?.employment_status || "Active"} tone="verified" />
            <StatusPill label={u?.employee_number || "—"} tone="neutral" />
          </View>
        </View>

        {/* Quick-action strip */}
        <View style={styles.qaRow}>
          {QUICK_ACTIONS.map((item) => (
            <QuickAction key={item.id} item={item} onPress={() => handleQuickAction(item)} />
          ))}
        </View>

        <Text style={styles.groupLabel}>Credentials</Text>
        <Group>
          <CredRow
            icon="shield-checkmark-outline"
            title="Ontario Security Guard Licence"
            number={u?.licence_number || "—"}
            expiry={u?.licence_expiry ? new Date(u.licence_expiry).toLocaleDateString("en-US", { month: "short", d: "numeric", year: "numeric" } as any) : "—"}
          />
          {(u?.certifications || []).map((c: any, i: number) => (
            <CredRow
              key={i}
              icon="document-text-outline"
              title={c.name || c}
              number={c.number || ""}
              expiry={c.expiry ? new Date(c.expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
              last={i === (u?.certifications?.length ?? 1) - 1}
            />
          ))}
        </Group>

        <Text style={styles.groupLabel}>Contact</Text>
        <Group>
          <ContactRow icon="mail-outline" value={u?.email} />
          {u?.phone && <ContactRow icon="call-outline" value={u.phone} />}
          {u?.emergency_contact && (
            <ContactRow icon="person-outline" value={`${u.emergency_contact.name} (${u.emergency_contact.relation})`} last />
          )}
        </Group>

        {eq.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Equipment</Text>
            <View style={styles.eqRow}>
              {eq.map((e: any) => (
                <View key={e.id} style={styles.eqCard}>
                  <Ionicons name="cube-outline" size={28} color={theme.colors.textSecondary} />
                  <Text style={styles.eqName} numberOfLines={2}>{e.description || e.type}</Text>
                  <View style={styles.eqBadge}><Text style={styles.eqBadgeText}>Assigned</Text></View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.groupLabel}>More</Text>
        <Group>
          <NavRow icon="school-outline" label="Onboarding" onPress={() => router.push("/onboarding")} testID="go-onboarding" />
          <NavRow icon="cash-outline" label="Payroll" onPress={() => router.push("/payroll")} testID="go-payroll" />
          <NavRow icon="warning-outline" label="Incident Reports" onPress={() => router.push("/incidents")} testID="go-incidents" last />
        </Group>

        <Pressable testID="logout-btn" onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ children }: any) {
  return <View style={styles.group}>{children}</View>;
}

function CredRow({ icon, title, number, expiry, last }: { icon: any; title: string; number: string; expiry: string; last?: boolean }) {
  return (
    <View style={[styles.credRow, !last && styles.rowBorder]}>
      <View style={styles.credIcon}><Ionicons name={icon} size={18} color={theme.colors.textSecondary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.credTitle}>{title}</Text>
        {number ? <Text style={styles.credNumber}>{number}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {expiry ? <Text style={styles.credExpLabel}>Expires</Text> : null}
        {expiry ? <Text style={styles.credExpiry}>{expiry}</Text> : null}
        <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}

function ContactRow({ icon, value, last }: { icon: any; value?: string; last?: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.contactRow, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={17} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
      <Text style={styles.contactValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
    </View>
  );
}

function NavRow({ icon, label, onPress, last, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.navRow, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={19} color={theme.colors.text} style={{ marginRight: 12 }} />
      <Text style={styles.navLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  topBarTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  topBarIcon: { padding: 4 },

  header: { paddingTop: 16, paddingBottom: 20, alignItems: "center" },
  avatarWrap: { position: "relative" },
  avatarEditBtn: { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  name: { color: theme.colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: 12 },
  handle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },

  qaRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  qaWrap: { flex: 1 },
  qaBtn: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  qaIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  qaLabel: { color: theme.colors.text, fontSize: 13, fontWeight: "600", textAlign: "center" },
  qaSub: { color: theme.colors.textTertiary, fontSize: 11, textAlign: "center", lineHeight: 14 },

  groupLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, paddingHorizontal: 4, marginTop: 4 },
  group: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16, marginBottom: 8 },

  credRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 },
  credIcon: { width: 32, alignItems: "center" },
  credTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "500" },
  credNumber: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 },
  credExpLabel: { color: theme.colors.textTertiary, fontSize: 10, textAlign: "right" },
  credExpiry: { color: theme.colors.textSecondary, fontSize: 12, textAlign: "right" },

  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  contactValue: { color: theme.colors.text, fontSize: 14, flex: 1 },

  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },

  eqRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  eqCard: { width: "30%", backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 12, alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  eqName: { color: theme.colors.text, fontSize: 12, fontWeight: "500", textAlign: "center" },
  eqBadge: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  eqBadgeText: { color: "#22C55E", fontSize: 10, fontWeight: "600" },

  navRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  navLabel: { color: theme.colors.text, fontSize: 15, flex: 1 },

  logoutBtn: { marginTop: 28, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: theme.colors.error || "#E13B3B", fontSize: 15 },
});
