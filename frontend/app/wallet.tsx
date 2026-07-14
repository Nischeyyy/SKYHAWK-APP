import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { formatDate } from "@/src/utils/format";

// ─── Light palette (matches Profile / Schedule) ─────────────────────────────
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  divider: "#E5E5EA",
  text: "#0B0B0C",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  danger: "#E13B3B",
  warning: "#C77700",
  verified: "#2FAE59",
};

export default function Wallet() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletData, complianceData] = await Promise.all([
        api("/wallet"),
        api("/compliance/status"),
      ]);
      setData(walletData);
      setCompliance(complianceData);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header router={router} />
        <ActivityIndicator color={C.textSecondary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header router={router} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Text style={{ color: C.textSecondary, fontSize: 15, textAlign: "center" }}>
            Couldn't load your wallet. Pull to refresh.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const emp = data.employee;
  const docs: any[] = compliance?.documents ?? data.documents ?? [];
  const overallStatus: string = compliance?.overall_status ?? "compliant";
  const expiredCount: number = compliance?.expired_count ?? 0;
  const expiringSoonCount: number = compliance?.expiring_soon_count ?? 0;
  const hasAlert = overallStatus !== "compliant";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header router={router} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compliance alert banner */}
        {hasAlert && (
          <View
            style={[
              styles.complianceBanner,
              overallStatus === "expired" ? styles.bannerDanger : styles.bannerWarning,
            ]}
          >
            <Ionicons
              name={overallStatus === "expired" ? "alert-circle" : "warning-outline"}
              size={20}
              color={overallStatus === "expired" ? C.danger : C.warning}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: overallStatus === "expired" ? C.danger : C.warning },
                ]}
              >
                {overallStatus === "expired" ? "Credential Expired" : "Credential Expiring Soon"}
              </Text>
              <Text style={styles.bannerSub}>
                {expiredCount > 0 && `${expiredCount} expired. `}
                {expiringSoonCount > 0 && `${expiringSoonCount} expiring within 30 days. `}
                Contact HR to renew.
              </Text>
            </View>
          </View>
        )}

        {/* Employee ID card */}
        <View style={styles.idCard} testID="id-card">
          <View style={styles.idHeader}>
            <View>
              <Text style={styles.idBrand}>disptchr</Text>
              <Text style={styles.idBrandSub}>Employee ID</Text>
            </View>
            <Text style={styles.idNumber}>{emp.employee_number}</Text>
          </View>
          <Text style={styles.idName}>{emp.full_name}</Text>
          <Text style={styles.idRole}>{emp.employment_status}</Text>
          <View style={styles.qrRow}>
            <View style={styles.qrBox}>
              <MockQR value={data.qr_payload} />
            </View>
            <View style={{ flex: 1, marginLeft: 20 }}>
              <Text style={styles.qrLabel}>SCAN AT SITE</Text>
              <Text style={styles.qrHint}>Present QR for identity verification</Text>
            </View>
          </View>
        </View>

        {/* Credentials with live compliance status */}
        <Text style={styles.groupLabel}>Credentials</Text>
        <View style={styles.docList}>
          {docs.map((doc: any, i: number) => {
            const cs: string = doc.compliance_status ?? doc.status ?? "valid";
            const daysLeft: number | null = doc.days_until_expiry ?? null;
            const dotColor =
              cs === "expired" ? C.danger
              : cs === "expiring_soon" ? C.warning
              : cs === "expiring" ? C.warning
              : C.verified;
            const expiryColor =
              cs === "expired" ? C.danger
              : cs === "expiring_soon" ? C.warning
              : C.textSecondary;
            return (
              <View
                key={doc.id}
                testID={`doc-${doc.type}`}
                style={[styles.docRow, i < docs.length - 1 && styles.docRowBorder]}
              >
                <View style={[styles.docDot, { backgroundColor: dotColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docNumber}>{doc.number}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.docExpiry, { color: expiryColor }]}>
                    {cs === "expired" ? "EXPIRED" : `Exp. ${formatDate(doc.expiry)}`}
                  </Text>
                  {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                    <Text style={[styles.daysLeft, { color: expiryColor }]}>{daysLeft}d left</Text>
                  )}
                </View>
              </View>
            );
          })}
          {docs.length === 0 && (
            <Text style={{ color: C.textSecondary, fontSize: 14, padding: 16, textAlign: "center" }}>
              No credentials on file
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={styles.header}>
      <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
        <Ionicons name="chevron-back" size={26} color={C.text} />
      </Pressable>
      <Text style={styles.title}>Wallet</Text>
    </View>
  );
}

function MockQR({ value }: { value: string }) {
  const size = 11;
  const cells: boolean[] = [];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  for (let i = 0; i < size * size; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    cells.push((hash & 1) === 1);
  }
  const corner = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
  const cell = 84 / size;
  return (
    <View style={{ width: 100, height: 100, backgroundColor: "#fff", padding: 8, borderRadius: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 84, height: 84 }}>
        {cells.map((on, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const filled = corner(r, c) || on;
          return (
            <View
              key={i}
              style={{ width: cell, height: cell, backgroundColor: filled ? "#000" : "transparent" }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },
  title: { color: C.text, fontSize: 20, fontWeight: "600" },
  complianceBanner: {
    borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    marginBottom: 20, borderWidth: 1,
  },
  bannerDanger: {
    backgroundColor: "rgba(225,59,59,0.07)",
    borderColor: "rgba(225,59,59,0.25)",
  },
  bannerWarning: {
    backgroundColor: "rgba(199,119,0,0.07)",
    borderColor: "rgba(199,119,0,0.25)",
  },
  bannerTitle: { fontSize: 14, fontWeight: "600" },
  bannerSub: { color: C.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 },
  idCard: { backgroundColor: C.card, borderRadius: 18, padding: 22, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  idHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  idBrand: { color: C.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  idBrandSub: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  idNumber: { color: C.textSecondary, fontSize: 13, fontFamily: "monospace" },
  idName: { color: C.text, fontSize: 22, fontWeight: "600", marginTop: 20 },
  idRole: { color: C.textSecondary, fontSize: 14, marginTop: 3 },
  qrRow: {
    flexDirection: "row", alignItems: "center", marginTop: 24,
    paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider,
  },
  qrBox: {},
  qrLabel: { color: C.textSecondary, fontSize: 11, letterSpacing: 0.6, fontWeight: "600" },
  qrHint: { color: C.textSecondary, fontSize: 13, marginTop: 4 },
  groupLabel: {
    color: C.textSecondary, fontSize: 12,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginTop: 32, marginBottom: 8, paddingHorizontal: 4,
  },
  docList: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  docRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 },
  docRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  docDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  docName: { color: C.text, fontSize: 15 },
  docNumber: { color: C.textSecondary, fontSize: 12, marginTop: 2, fontFamily: "monospace" },
  docExpiry: { fontSize: 12, fontWeight: "500" },
  daysLeft: { fontSize: 11, marginTop: 2 },
});
