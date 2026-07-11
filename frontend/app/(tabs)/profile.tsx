import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
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
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  const u = data?.user || user;
  const eq = data?.equipment || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}>
        <View style={styles.profileHead}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInit}>
              {u?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.name}>{u?.full_name}</Text>
          <Text style={styles.role}>{u?.employment_status}</Text>
          <View style={styles.empNumBox}>
            <Text style={styles.empNumLabel}>EMPLOYEE #</Text>
            <Text style={styles.empNum}>{u?.employee_number}</Text>
          </View>
        </View>

        <Section title="CONTACT">
          <Row label="Email" value={u?.email} />
          <Row label="Phone" value={u?.phone || "—"} />
        </Section>

        <Section title="CREDENTIALS">
          <Row label="Licence #" value={u?.licence_number || "—"} />
          <Row label="Licence Expiry" value={u?.licence_expiry ? new Date(u.licence_expiry).toLocaleDateString() : "—"} />
          <Row label="Certifications" value={(u?.certifications || []).join(", ") || "—"} />
        </Section>

        {u?.emergency_contact && (
          <Section title="EMERGENCY CONTACT">
            <Row label="Name" value={u.emergency_contact.name} />
            <Row label="Phone" value={u.emergency_contact.phone} />
            <Row label="Relation" value={u.emergency_contact.relation} />
          </Section>
        )}

        <Section title="EQUIPMENT ASSIGNED">
          {eq.length === 0 && <Text style={styles.emptyRow}>None issued</Text>}
          {eq.map((e: any) => (
            <View key={e.id} testID={`equipment-${e.type}`} style={styles.equipRow}>
              <Ionicons name={equipIcon(e.type)} size={16} color={theme.colors.brandPrimary} />
              <Text style={styles.equipDesc}>{e.description}</Text>
              <View style={styles.equipStatus}>
                <Text style={styles.equipStatusText}>{e.status}</Text>
              </View>
            </View>
          ))}
        </Section>

        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
          <Pressable testID="go-onboarding" onPress={() => router.push("/onboarding")} style={styles.linkBtn}>
            <Ionicons name="school" size={18} color={theme.colors.brandPrimary} />
            <Text style={styles.linkText}>Onboarding Progress</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
          <Pressable testID="go-payroll" onPress={() => router.push("/payroll")} style={styles.linkBtn}>
            <Ionicons name="cash" size={18} color={theme.colors.brandPrimary} />
            <Text style={styles.linkText}>Payroll & Pay Stubs</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
          <Pressable testID="go-incidents" onPress={() => router.push("/incidents")} style={styles.linkBtn}>
            <Ionicons name="warning" size={18} color={theme.colors.brandPrimary} />
            <Text style={styles.linkText}>My Incident Reports</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        </View>

        <Button testID="logout-btn" label="LOG OUT" variant="ghost" onPress={logout} style={{ marginTop: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function equipIcon(type: string): any {
  const map: any = { uniform: "shirt", radio: "radio", keys: "key", parking: "car" };
  return map[type] || "cube";
}

function Section({ title, children }: any) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  profileHead: { alignItems: "center", paddingVertical: theme.spacing.xl },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: theme.colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  avatarInit: { color: theme.colors.onBrandPrimary, fontSize: 30, fontWeight: "900" },
  name: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: theme.spacing.md },
  role: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  empNumBox: { marginTop: theme.spacing.md, alignItems: "center" },
  empNumLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  empNum: { color: theme.colors.brandPrimary, fontSize: 16, fontWeight: "800", fontFamily: "monospace" },
  section: {
    backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md,
    padding: theme.spacing.lg, marginTop: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  sectionLabel: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: theme.spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 13 },
  rowValue: { color: theme.colors.onSurface, fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  emptyRow: { color: theme.colors.onSurfaceTertiary, fontStyle: "italic" },
  equipRow: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingVertical: 8,
  },
  equipDesc: { color: theme.colors.onSurface, fontSize: 13, flex: 1 },
  equipStatus: { backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  equipStatusText: { color: theme.colors.brandPrimary, fontSize: 10, fontWeight: "700" },
  linkBtn: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  linkText: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "600", flex: 1 },
});
