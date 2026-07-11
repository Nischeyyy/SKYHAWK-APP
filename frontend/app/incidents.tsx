import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { relativeTime } from "@/src/utils/format";

const TYPES = [
  { id: "incident", label: "Incident" },
  { id: "injury", label: "Injury" },
  { id: "lost_found", label: "Lost & Found" },
  { id: "property_damage", label: "Property" },
];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function Incidents() {
  const router = useRouter();
  const [tab, setTab] = useState<"new" | "history">("new");
  const [type, setType] = useState("incident");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [witnessName, setWitnessName] = useState("");
  const [witnessPhone, setWitnessPhone] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const d = await api("/incidents");
      setItems(d.incidents);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const pickPhoto = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.4, base64: true });
    if (!r.canceled && r.assets[0].base64) setPhotos((prev) => [...prev, r.assets[0].base64!]);
  };

  const submit = async () => {
    setError(null);
    if (description.trim().length < 10) { setError("Description too short (min 10 chars)"); return; }
    if (!signed) { setError("Digital signature required"); return; }
    setSubmitting(true);
    try {
      await api("/incidents", { method: "POST", body: {
        type, description: description.trim(), severity,
        witness_name: witnessName || undefined, witness_contact: witnessPhone || undefined,
        photos, signature_base64: "signed",
      } });
      setToast("Report submitted");
      setTimeout(() => setToast(null), 2500);
      setDescription(""); setWitnessName(""); setWitnessPhone(""); setPhotos([]); setSigned(false);
      setTab("history");
      await loadHistory();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Incident Report</Text>
      </View>

      <View style={styles.segmented}>
        <Pressable testID="tab-new" onPress={() => setTab("new")} style={[styles.segBtn, tab === "new" && styles.segActive]}>
          <Text style={[styles.segText, tab === "new" && styles.segTextActive]}>New</Text>
        </Pressable>
        <Pressable testID="tab-history" onPress={() => setTab("history")} style={[styles.segBtn, tab === "history" && styles.segActive]}>
          <Text style={[styles.segText, tab === "history" && styles.segTextActive]}>History · {items.length}</Text>
        </Pressable>
      </View>

      {tab === "new" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {TYPES.map((t) => (
                <Pressable key={t.id} testID={`type-${t.id}`} onPress={() => setType(t.id)} style={[styles.chip, type === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, type === t.id && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Severity</Text>
            <View style={styles.chipRow}>
              {SEVERITIES.map((s) => (
                <Pressable key={s} testID={`sev-${s}`} onPress={() => setSeverity(s)} style={[styles.chip, severity === s && styles.chipActive]}>
                  <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{s[0].toUpperCase() + s.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              testID="incident-description" value={description} onChangeText={setDescription}
              placeholder="What happened? Include location, time, involved parties…"
              placeholderTextColor={theme.colors.textTertiary}
              multiline numberOfLines={5}
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            />

            <Text style={styles.label}>Witness (optional)</Text>
            <TextInput testID="witness-name" value={witnessName} onChangeText={setWitnessName} placeholder="Name" placeholderTextColor={theme.colors.textTertiary} style={styles.input} />
            <TextInput testID="witness-phone" value={witnessPhone} onChangeText={setWitnessPhone} placeholder="Phone" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" style={styles.input} />

            <Text style={styles.label}>Photos ({photos.length})</Text>
            <View style={styles.photoRow}>
              {photos.map((_, i) => (
                <View key={i} testID={`photo-${i}`} style={styles.photoThumb}>
                  <Ionicons name="image" size={22} color={theme.colors.textSecondary} />
                </View>
              ))}
              <Pressable testID="add-photo-btn" onPress={pickPhoto} style={styles.addPhoto}>
                <Ionicons name="add" size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Signature</Text>
            <Pressable testID="signature-pad" onPress={() => setSigned((v) => !v)} style={[styles.sigPad, signed && styles.sigPadSigned]}>
              <Text style={[styles.sigText, signed && { color: theme.colors.text }]}>{signed ? "✓ Signed" : "Tap to sign"}</Text>
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}
            <View style={{ marginTop: 20 }}>
              <Button testID="submit-incident-btn" label={submitting ? "Submitting…" : "Submit Report"} onPress={submit} disabled={submitting} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {items.length === 0 && <Text style={styles.empty}>No incident reports</Text>}
          {items.map((i, idx) => (
            <View key={i.id} testID={`hist-${i.id}`} style={[styles.histRow, idx < items.length - 1 && styles.histRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.histType}>{i.type.replace("_", " ")}</Text>
                <Text style={styles.histDesc} numberOfLines={2}>{i.description}</Text>
                <Text style={styles.histMeta}>{relativeTime(i.created_at)} · {i.status}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {toast && (
        <View testID="toast" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  segmented: { flexDirection: "row", marginHorizontal: 20, backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: theme.radius.sm },
  segActive: { backgroundColor: theme.colors.cardAlt },
  segText: { color: theme.colors.textSecondary, fontSize: 13 },
  segTextActive: { color: theme.colors.text, fontWeight: "500" },
  label: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: theme.colors.text },
  chipText: { color: theme.colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: theme.colors.bg, fontWeight: "600" },
  input: { backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.radius.md, padding: 14, fontSize: 15, marginBottom: 8 },
  photoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  photoThumb: { width: 66, height: 66, borderRadius: theme.radius.sm, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 66, height: 66, borderRadius: theme.radius.sm, borderWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  sigPad: { padding: 20, backgroundColor: theme.colors.card, borderRadius: theme.radius.md, alignItems: "center" },
  sigPadSigned: { borderWidth: 1, borderColor: theme.colors.text },
  sigText: { color: theme.colors.textSecondary, fontSize: 14 },
  error: { color: theme.colors.error, textAlign: "center", marginTop: 10, fontSize: 13 },
  histRow: { paddingVertical: 16 },
  histRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  histType: { color: theme.colors.text, fontSize: 15, fontWeight: "500", textTransform: "capitalize" },
  histDesc: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  histMeta: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  empty: { color: theme.colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  toast: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: theme.colors.card, padding: 12, borderRadius: theme.radius.md, alignItems: "center" },
  toastText: { color: theme.colors.text, fontSize: 14 },
});
