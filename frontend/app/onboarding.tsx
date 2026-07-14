import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

const W = {
  bg: "#FFFFFF",
  card: "#F2F2F7",
  border: "#E5E5EA",
  text: "#000000",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  verified: "#30D158",
};

const STEPS = [
  { key: "documents_uploaded", label: "Upload ID Documents" },
  { key: "sin_submitted", label: "Submit SIN" },
  { key: "direct_deposit_submitted", label: "Direct Deposit Info" },
  { key: "emergency_contact_added", label: "Emergency Contact" },
  { key: "agreements_signed", label: "Sign Employment Agreements" },
  { key: "training_complete", label: "Complete Training" },
];

export default function Onboarding() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api("/onboarding/status");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator color={W.textSecondary} style={{ marginTop: 40 }} />
    </SafeAreaView>
  );

  const status = data?.status || {};
  const pct = data?.percent || 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={W.text} />
        </Pressable>
        <Text style={styles.title}>Onboarding</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.percent}>{pct}%</Text>
            <Text style={styles.steps}>{data?.completed} of {data?.total} steps</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
        </View>

        <View style={styles.stepsList}>
          {STEPS.map((s, i) => {
            const done = status[s.key];
            return (
              <View key={s.key} testID={`step-${s.key}`} style={[styles.stepRow, i < STEPS.length - 1 && styles.stepRowBorder]}>
                <View style={[styles.check, done && styles.checkDone]}>
                  {done && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.stepText, done && styles.stepTextDone]}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: W.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: W.text, fontSize: 20, fontWeight: "600" },
  progressWrap: { paddingVertical: 20 },
  progressHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  percent: { color: W.text, fontSize: 40, fontWeight: "700", letterSpacing: -1 },
  steps: { color: W.textSecondary, fontSize: 14 },
  progressBar: { height: 4, backgroundColor: W.card, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: W.text },
  stepsList: { backgroundColor: W.card, borderRadius: 10, paddingHorizontal: 16, marginTop: 20 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  stepRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: W.border },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: W.border, alignItems: "center", justifyContent: "center", marginRight: 14 },
  checkDone: { backgroundColor: W.text, borderColor: W.text },
  stepText: { color: W.textSecondary, fontSize: 15 },
  stepTextDone: { color: W.text, fontWeight: "500" },
});
