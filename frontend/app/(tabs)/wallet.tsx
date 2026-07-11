import React, { useCallback, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatDate } from "@/src/utils/format";

const { width } = Dimensions.get("window");

export default function Wallet() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/wallet");
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

  const emp = data.employee;
  const docs = data.documents || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>DIGITAL WALLET</Text>
        <Text style={styles.subtitle}>Show at client sites for verification</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}>
        {/* Primary ID card */}
        <View style={styles.idCard} testID="id-card">
          <View style={styles.idHeader}>
            <View style={styles.idLogoBox}>
              <Text style={styles.idLogoText}>SH</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.idBrand}>SKYHAWK</Text>
              <Text style={styles.idSubBrand}>SECURITY OPERATIONS</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.idBody}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarInit}>{emp.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
              <Text style={styles.idName}>{emp.full_name}</Text>
              <Text style={styles.idNumberLabel}>EMPLOYEE #</Text>
              <Text style={styles.idNumber}>{emp.employee_number}</Text>
              <Text style={styles.idLicenceLabel}>LICENCE</Text>
              <Text style={styles.idLicence}>{emp.licence_number || "—"}</Text>
            </View>
          </View>

          <View style={styles.qrBox}>
            <View style={styles.qrPlaceholder}>
              <MockQR value={data.qr_payload} />
            </View>
            <Text style={styles.qrLabel}>QR EMPLOYEE ID</Text>
            <Text style={styles.qrPayload}>{data.qr_payload}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>CERTIFICATIONS & LICENCES</Text>
        {docs.map((doc: any) => (
          <View key={doc.id} testID={`doc-${doc.type}`} style={styles.docCard}>
            <View style={styles.docIcon}>
              <Ionicons name={docIcon(doc.type)} size={20} color={theme.colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={styles.docNumber}>{doc.number}</Text>
              <Text style={styles.docExpiry}>
                Expires {formatDate(doc.expiry)}
              </Text>
            </View>
            <View style={[styles.docStatus, {
              backgroundColor: doc.status === "expiring_soon" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
            }]}>
              <Text style={[styles.docStatusText, {
                color: doc.status === "expiring_soon" ? theme.colors.warning : theme.colors.success,
              }]}>
                {doc.status === "expiring_soon" ? "SOON" : "VALID"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function docIcon(type: string) {
  const map: any = {
    security_licence: "shield-checkmark",
    company_id: "person",
    first_aid: "medkit",
    smart_serve: "wine",
    whmis: "flask",
    work_permit: "document-text",
  };
  return map[type] || "document";
}

// Simple visual mock QR (grid pattern derived from payload hash)
function MockQR({ value }: { value: string }) {
  const size = 12;
  const cells: boolean[] = [];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  for (let i = 0; i < size * size; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    cells.push((hash & 1) === 1);
  }
  // Corner markers
  const corner = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
  return (
    <View style={{ width: 140, height: 140, backgroundColor: "#fff", padding: 8, borderRadius: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 124, height: 124 }}>
        {cells.map((on, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const filled = corner(r, c) || on;
          return (
            <View
              key={i}
              style={{
                width: 124 / size,
                height: 124 / size,
                backgroundColor: filled ? "#0F172A" : "transparent",
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  title: { color: theme.colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  idCard: {
    backgroundColor: "#111827",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2, borderColor: theme.colors.brandPrimary,
  },
  idHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md },
  idLogoBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brandTertiary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.brandPrimary,
  },
  idLogoText: { color: theme.colors.brandPrimary, fontWeight: "900", letterSpacing: 1 },
  idBrand: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "900", letterSpacing: 3 },
  idSubBrand: { color: theme.colors.brandPrimary, fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success },
  statusPillText: { color: theme.colors.success, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  idBody: { flexDirection: "row", marginTop: theme.spacing.lg },
  avatarBox: {
    width: 76, height: 76, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  avatarInit: { color: theme.colors.onBrandPrimary, fontSize: 28, fontWeight: "900" },
  idName: { color: theme.colors.onSurface, fontSize: 18, fontWeight: "800" },
  idNumberLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, marginTop: 8, fontWeight: "700" },
  idNumber: { color: theme.colors.brandPrimary, fontSize: 14, fontWeight: "800", fontFamily: "monospace" },
  idLicenceLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, marginTop: 6, fontWeight: "700" },
  idLicence: { color: theme.colors.onSurface, fontSize: 13, fontWeight: "600", fontFamily: "monospace" },
  qrBox: { alignItems: "center", marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  qrPlaceholder: { alignItems: "center", justifyContent: "center" },
  qrLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 2, fontWeight: "700", marginTop: 10 },
  qrPayload: { color: theme.colors.onSurfaceSecondary, fontSize: 11, marginTop: 4, fontFamily: "monospace" },
  sectionLabel: { color: theme.colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: theme.spacing.md },
  docCard: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  docIcon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  docName: { color: theme.colors.onSurface, fontSize: 14, fontWeight: "700" },
  docNumber: { color: theme.colors.onSurfaceTertiary, fontSize: 12, marginTop: 2, fontFamily: "monospace" },
  docExpiry: { color: theme.colors.onSurfaceSecondary, fontSize: 11, marginTop: 4 },
  docStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm },
  docStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
