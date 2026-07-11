import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Avatar, StatusPill } from "@/src/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api("/profile");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;
  }

  const u = data?.user || user;
  const eq = data?.equipment || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name={u?.full_name} size={72} testID="profile-avatar" />
          <Text style={styles.name}>{u?.full_name}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <StatusPill label={u?.employment_status || "Active"} tone="verified" />
            <StatusPill label={u?.employee_number || ""} tone="neutral" />
          </View>
        </View>

        <Group>
          <Row label="Email" value={u?.email} last={!u?.phone} />
          {u?.phone && <Row label="Phone" value={u.phone} last />}
        </Group>

        <Text style={styles.groupLabel}>Credentials</Text>
        <Group>
          <Row label="Licence" value={u?.licence_number || "—"} />
          <Row label="Expiry" value={u?.licence_expiry ? new Date(u.licence_expiry).toLocaleDateString() : "—"} />
          <Row label="Certifications" value={`${(u?.certifications || []).length}`} last />
        </Group>

        {u?.emergency_contact && (
          <>
            <Text style={styles.groupLabel}>Emergency Contact</Text>
            <Group>
              <Row label="Name" value={u.emergency_contact.name} />
              <Row label="Phone" value={u.emergency_contact.phone} />
              <Row label="Relation" value={u.emergency_contact.relation} last />
            </Group>
          </>
        )}

        {eq.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Equipment</Text>
            <Group>
              {eq.map((e: any, i: number) => (
                <Row key={e.id} testID={`equipment-${e.type}`} label={e.type[0].toUpperCase() + e.type.slice(1)} value={e.description} last={i === eq.length - 1} />
              ))}
            </Group>
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

function Row({ label, value, last, testID }: any) {
  return (
    <View testID={testID} style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
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
  header: { paddingTop: 20, paddingBottom: 24, alignItems: "center" },
  name: { color: theme.colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.4, marginTop: 14 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  groupLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 24, marginBottom: 6, paddingHorizontal: 4 },
  group: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowLabel: { color: theme.colors.text, fontSize: 15 },
  rowValue: { color: theme.colors.textSecondary, fontSize: 15, maxWidth: "55%", textAlign: "right" },
  navRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  navLabel: { color: theme.colors.text, fontSize: 15, flex: 1 },
  logoutBtn: { marginTop: 32, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: theme.colors.error, fontSize: 15 },
});
