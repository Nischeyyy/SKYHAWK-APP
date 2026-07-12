import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatDate } from "@/src/utils/format";

export default function Wallet() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/wallet");
      setData(d);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} /></SafeAreaView>;
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>Couldn't load your wallet. Pull up or try again shortly.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emp = data.employee;
  const docs = data.documents || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.idCard} testID="id-card">
          <View style={styles.idHeader}>
            <View>
              <Text style={styles.idBrand}>Skyhawk</Text>
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

        <Text style={styles.groupLabel}>Credentials</Text>
        <View style={styles.docList}>
          {docs.map((doc: any, i: number) => (
            <View
              key={doc.id}
              testID={`doc-${doc.type}`}
              style={[styles.docRow, i < docs.length - 1 && styles.docRowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docNumber}>{doc.number}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.docExpiry, doc.status === "expiring_soon" && { color: theme.colors.warning }]}>
                  Expires {formatDate(doc.expiry)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  const corner = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
  const cell = 84 / size;
  return (
    <View style={{ width: 100, height: 100, backgroundColor: "#fff", padding: 8, borderRadius: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 84, height: 84 }}>
        {cells.map((on, i) => {
          const r = Math.floor(i / size); const c = i % size;
          const filled = corner(r, c) || on;
          return <View key={i} style={{ width: cell, height: cell, backgroundColor: filled ? "#000" : "transparent" }} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  idCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 22,
  },
  idHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  idBrand: { color: theme.colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  idBrandSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  idNumber: { color: theme.colors.textSecondary, fontSize: 13, fontFamily: "monospace" },
  idName: { color: theme.colors.text, fontSize: 22, fontWeight: "600", marginTop: 20 },
  idRole: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 3 },
  qrRow: { flexDirection: "row", alignItems: "center", marginTop: 24, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  qrBox: {},
  qrLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 0.6, fontWeight: "600" },
  qrHint: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  groupLabel: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 32, marginBottom: 8, paddingHorizontal: 4 },
  docList: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  docRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  docRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  docName: { color: theme.colors.text, fontSize: 15 },
  docNumber: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: "monospace" },
  docExpiry: { color: theme.colors.textSecondary, fontSize: 13 },
});
