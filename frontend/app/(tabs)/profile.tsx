import React, { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { DeadButton } from "@/src/components/DeadButton";

// ─── Light palette (matches Schedule / reference design) ───────────────────
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  divider: "#E5E5EA",
  text: "#0B0B0C",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  red: "#E13B3B",
  blue: "#0A84FF",
  green: "#2FAE59",
};

// ─── Quick actions ──────────────────────────────────────────────────────────
const ACTIONS = [
  { id: "employment", icon: "briefcase-outline" as const, label: "Employment", sub: "Status & role", iconColor: C.blue, iconBg: "rgba(10,132,255,0.10)", route: "/employment" },
  { id: "payroll",     icon: "cash-outline"      as const, label: "Payroll",    sub: "Pay & stubs",   iconColor: C.green, iconBg: "rgba(47,174,89,0.10)", route: "/payroll"    },
  { id: "settings",    icon: "settings-outline"  as const, label: "Settings",   sub: "Preferences",   iconColor: C.text, iconBg: "rgba(0,0,0,0.06)",     route: "/settings"   },
];

function ActionCell({ item, onPress, isLast }: { item: typeof ACTIONS[0]; onPress: () => void; isLast: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[s.actionCellWrap, { transform: [{ scale }] }]}>
      <Pressable
        testID={`quick-${item.id}`}
        style={s.actionCell}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 60 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }).start()}
      >
        <View style={[s.actionIconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </View>
        <Text style={s.actionLabel}>{item.label}</Text>
        <Text style={s.actionSub}>{item.sub}</Text>
      </Pressable>
      {!isLast && <View style={s.actionDivider} />}
    </Animated.View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
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

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color={C.textSecondary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  const u = data?.user || user;
  const eq = data?.equipment || [];
  const certs = u?.certifications || [];

  const handleAction = (item: typeof ACTIONS[0]) => {
    if (item.route) router.push(item.route as any);
    else if ((item as any).phone) Linking.openURL(`tel:${(item as any).phone}`);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Nav bar */}
      <View style={s.navbar}>
        <Text style={s.navTitle}>Profile</Text>
        <View style={s.navIcons}>
          <Pressable hitSlop={10} style={s.navIconBtn}>
            <DeadButton>
              <Ionicons name="notifications-outline" size={22} color={C.text} />
            </DeadButton>
          </Pressable>
          <Pressable hitSlop={10} style={s.navIconBtn} onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={22} color={C.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero / avatar */}
        <View style={s.hero}>
          <View style={s.avatarContainer}>
            <Avatar name={u?.full_name} size={88} testID="profile-avatar" />
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={13} color={C.textSecondary} />
            </View>
          </View>
          <Text style={s.heroName}>{u?.full_name}</Text>
          <Text style={s.heroSub}>
            @{(u?.full_name || "").toLowerCase().replace(/\s+/g, "")} · {u?.employment_status || "Full-Time"}
          </Text>
          <View style={s.heroBadges}>
            <View style={s.activeBadge}>
              <View style={s.greenDot} />
              <Text style={s.activeBadgeText}>{u?.employment_status || "Active"}</Text>
            </View>
            <View style={s.idBadge}>
              <Text style={s.idBadgeText}>{u?.employee_number || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Quick-action strip — single card, 3 equal cells with dividers */}
        <View style={s.actionsCard}>
          {ACTIONS.map((item, i) => (
            <ActionCell key={item.id} item={item} onPress={() => handleAction(item)} isLast={i === ACTIONS.length - 1} />
          ))}
        </View>

        {/* Credentials */}
        <SectionLabel label="Credentials" actionLabel="View all" />
        <View style={s.card}>
          <CredRow
            icon="shield-checkmark-outline"
            title="Ontario Security Guard Licence"
            number={u?.licence_number || "—"}
            expiry={u?.licence_expiry ? fmt(u.licence_expiry) : "—"}
          />
          {certs.map((c: any, i: number) => (
            <CredRow
              key={i}
              icon="document-outline"
              title={typeof c === "string" ? c : (c.name || c)}
              number={typeof c === "object" ? (c.number || "") : ""}
              expiry={typeof c === "object" && c.expiry ? fmt(c.expiry) : ""}
              last={i === certs.length - 1}
            />
          ))}
          {certs.length === 0 && (
            <CredRow icon="document-outline" title="First Aid & CPR" number="FA-2024-88112" expiry="Feb 6, 2026" />
          )}
        </View>

        {/* Contact */}
        <SectionLabel label="Contact" />
        <View style={s.card}>
          <ContactRow icon="mail-outline" label={u?.email} last={!u?.phone && !u?.emergency_contact} />
          {u?.phone && (
            <ContactRow icon="call-outline" label={u.phone} last={!u?.emergency_contact} />
          )}
          {u?.emergency_contact && (
            <ContactRow
              icon="person-outline"
              label={`${u.emergency_contact.name} (${u.emergency_contact.relation})`}
              last
            />
          )}
        </View>

        {/* Equipment */}
        {eq.length > 0 && (
          <>
            <SectionLabel label="Equipment" actionLabel="View all" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20 }}>
                {eq.map((e: any) => (
                  <View key={e.id} style={s.eqCard}>
                    <Ionicons name="cube-outline" size={32} color={C.textSecondary} />
                    <Text style={s.eqName} numberOfLines={2}>{e.description || e.type}</Text>
                    <View style={s.eqBadge}><Text style={s.eqBadgeText}>● Assigned</Text></View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* More */}
        <SectionLabel label="More" />
        <View style={s.card}>
          <NavRow icon="school-outline"  label="Onboarding"       onPress={() => router.push("/onboarding")} testID="go-onboarding" />
          <NavRow icon="cash-outline"    label="Payroll"           onPress={() => router.push("/payroll")}    testID="go-payroll"    />
          <NavRow icon="card-outline"    label="Wallet"            onPress={() => router.push("/wallet")}     testID="go-wallet"     />
          <NavRow icon="warning-outline" label="Incident Reports"  onPress={() => router.push("/incidents")}  testID="go-incidents"  last />
        </View>

        <Pressable testID="logout-btn" onPress={logout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionLabel({ label, actionLabel }: { label: string; actionLabel?: string }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionLabel}>{label}</Text>
      {actionLabel && <Text style={s.sectionAction}>{actionLabel}</Text>}
    </View>
  );
}

function CredRow({ icon, title, number, expiry, last }: { icon: any; title: string; number: string; expiry: string; last?: boolean }) {
  return (
    <View style={[s.credRow, !last && s.rowBorder]}>
      <View style={s.credIconWrap}><Ionicons name={icon} size={20} color={C.textSecondary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.credTitle}>{title}</Text>
        {number ? <Text style={s.credNumber}>{number}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {expiry ? <Text style={s.credExpLabel}>Expires</Text> : null}
        {expiry ? <Text style={s.credExpiry}>{expiry}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textTertiary} style={{ marginLeft: 6 }} />
    </View>
  );
}

function ContactRow({ icon, label, last }: { icon: any; label?: string; last?: boolean }) {
  if (!label) return null;
  return (
    <View style={[s.contactRow, !last && s.rowBorder]}>
      <Ionicons name={icon} size={18} color={C.textSecondary} style={{ marginRight: 14 }} />
      <Text style={s.contactText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
    </View>
  );
}

function NavRow({ icon, label, onPress, last, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[s.navRow, !last && s.rowBorder]}>
      <Ionicons name={icon} size={19} color={C.text} style={{ marginRight: 14 }} />
      <Text style={s.navLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 120 },

  // Nav
  navbar:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  navTitle:    { color: C.text, fontSize: 17, fontWeight: "600" },
  navIcons:    { flexDirection: "row", gap: 4 },
  navIconBtn:  { padding: 6 },

  // Hero
  hero:            { alignItems: "center", paddingBottom: 24, paddingTop: 8 },
  avatarContainer: { position: "relative", marginBottom: 14 },
  cameraBtn:       { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.bg, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  heroName:        { color: C.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  heroSub:         { color: C.textSecondary, fontSize: 13.5, marginTop: 4 },
  heroBadges:      { flexDirection: "row", gap: 8, marginTop: 12 },
  activeBadge:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(47,174,89,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  greenDot:        { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.green },
  activeBadgeText: { color: C.green, fontSize: 12, fontWeight: "600" },
  idBadge:         { backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  idBadgeText:     { color: C.textSecondary, fontSize: 12, fontWeight: "600" },

  // Quick actions — single card, cells separated by hairline dividers
  actionsCard:     { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, marginHorizontal: 20, marginBottom: 28, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  actionCellWrap:  { flex: 1, position: "relative" },
  actionCell:      { alignItems: "center", justifyContent: "center", paddingVertical: 18, paddingHorizontal: 8, gap: 6 },
  actionIconCircle:{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  actionLabel:     { color: C.text, fontSize: 13, fontWeight: "600", textAlign: "center" },
  actionSub:       { color: C.textTertiary, fontSize: 11, textAlign: "center", lineHeight: 14 },
  actionDivider:   { position: "absolute", right: 0, top: "15%", bottom: "15%", width: StyleSheet.hairlineWidth, backgroundColor: C.divider },

  // Shared card
  card:       { backgroundColor: C.card, borderRadius: 14, marginHorizontal: 20, marginBottom: 8, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  rowBorder:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },

  // Section labels
  sectionRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 8, marginTop: 20 },
  sectionLabel:  { color: C.textSecondary, fontSize: 13, fontWeight: "500" },
  sectionAction: { color: C.accent, fontSize: 13 },

  // Credentials
  credRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16, gap: 0 },
  credIconWrap:{ width: 34, alignItems: "center" },
  credTitle:   { color: C.text, fontSize: 14, fontWeight: "500" },
  credNumber:  { color: C.textSecondary, fontSize: 12, marginTop: 1 },
  credExpLabel:{ color: C.textTertiary, fontSize: 10, textAlign: "right" },
  credExpiry:  { color: C.textSecondary, fontSize: 12, textAlign: "right" },

  // Contact
  contactRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
  contactText: { flex: 1, color: C.text, fontSize: 14 },

  // Equipment
  eqCard:       { width: 110, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  eqName:       { color: C.text, fontSize: 12, fontWeight: "500", textAlign: "center" },
  eqBadge:      { backgroundColor: "rgba(47,174,89,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  eqBadgeText:  { color: C.green, fontSize: 10, fontWeight: "600" },

  // Nav rows (More section)
  navRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16 },
  navLabel: { flex: 1, color: C.text, fontSize: 15 },

  // Sign out
  logoutBtn:  { marginTop: 28, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: C.red, fontSize: 15 },
});
