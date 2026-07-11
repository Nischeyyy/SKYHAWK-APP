import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Chip, Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { relativeTime } from "@/src/utils/format";

const TYPES = [
  { id: "incident", label: "Incident" },
  { id: "injury", label: "Injury" },
  { id: "lost_found", label: "Lost & Found" },
  { id: "property_damage", label: "Property Damage" },
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
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.4, base64: true,
    });
    if (!r.canceled && r.assets[0].base64) setPhotos((prev) => [...prev, r.assets[0].base64!]);
  };

  const submit = async () => {
    setError(null);
    if (description.trim().length < 10) {
      setError("Description too short (min 10 chars)");
      return;
    }
    if (!signed) {
      setError("Digital signature required");
      return;
    }
    setSubmitting(true);
    try {
      await api("/incidents", {
        method: "POST",
        body: {
          type, description: description.trim(), severity,
          witness_name: witnessName || undefined,
          witness_contact: witnessPhone || undefined,
          photos,
          signature_base64: signed ? "signed" : undefined,
        },
      });
      setToast("Incident report submitted");
      setTimeout(() => setToast(null), 3000);
      setDescription(""); setWitnessName(""); setWitnessPhone(""); setPhotos([]); setSigned(false);
      setTab("history");
      await loadHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>INCIDENT REPORTING</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabRow}>
        <Chip testID="tab-new" label="New Report" active={tab === "new"} onPress={() => setTab("new")} />
        <Chip testID="tab-history" label={`History (${items.length})`} active={tab === "history"} onPress={() => setTab("history")} />
      </View>

      {tab === "new" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>TYPE</Text>
            <View style={styles.chipsWrap}>
              {TYPES.map((t) => (
                <Chip key={t.id} testID={`type-${t.id}`} label={t.label} active={type === t.id} onPress={() => setType(t.id)} />
              ))}
            </View>

            <Text style={styles.label}>SEVERITY</Text>
            <View style={styles.chipsWrap}>
              {SEVERITIES.map((s) => (
                <Chip key={s} testID={`sev-${s}`} label={s.toUpperCase()} active={severity === s} onPress={() => setSeverity(s)} />
              ))}
            </View>

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              testID="incident-description"
              value={description}
              onChangeText={setDescription}
              placeholder="What happened? Include location, time, and involved parties..."
              placeholderTextColor={theme.colors.onSurfaceTertiary}
              multiline
              numberOfLines={5}
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            />

            <Text style={styles.label}>WITNESS (OPTIONAL)</Text>
            <TextInput testID="witness-name" value={witnessName} onChangeText={setWitnessName}
              placeholder="Name" placeholderTextColor={theme.colors.onSurfaceTertiary} style={styles.input} />
            <TextInput testID="witness-phone" value={witnessPhone} onChangeText={setWitnessPhone}
              placeholder="Phone" placeholderTextColor={theme.colors.onSurfaceTertiary}
              keyboardType="phone-pad" style={styles.input} />

            <Text style={styles.label}>PHOTOS ({photos.length})</Text>
            <View style={styles.photosRow}>
              {photos.map((_, i) => (
                <View key={i} style={styles.photoThumb} testID={`photo-${i}`}>
                  <Ionicons name="image" size={24} color={theme.colors.brandPrimary} />
                </View>
              ))}
              <Pressable testID="add-photo-btn" onPress={pickPhoto} style={styles.addPhoto}>
                <Ionicons name="add" size={28} color={theme.colors.onSurfaceTertiary} />
              </Pressable>
            </View>

            <Text style={styles.label}>DIGITAL SIGNATURE</Text>
            <Pressable testID="signature-pad" onPress={() => setSigned((v) => !v)} style={[styles.sigPad, signed && styles.sigPadSigned]}>
              <Ionicons name={signed ? "checkmark-circle" : "create"} size={22} color={signed ? theme.colors.success : theme.colors.onSurfaceTertiary} />
              <Text style={[styles.sigText, signed && { color: theme.colors.success }]}>
                {signed ? "Signed by employee" : "Tap to sign"}
              </Text>
            </Pressable>

            {error && (
              <Text style={{ color: theme.colors.error, marginTop: 8, textAlign: "center" }}>{error}</Text>
            )}

            <Button
              testID="submit-incident-btn"
              label={submitting ? "SUBMITTING..." : "SUBMIT REPORT"}
              onPress={submit}
              disabled={submitting}
              style={{ marginTop: theme.spacing.lg }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {items.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 }}>
              No incident reports filed
            </Text>
          )}
          {items.map((i) => (
            <View key={i.id} testID={`hist-${i.id}`} style={styles.histCard}>
              <View style={styles.histHead}>
                <Text style={styles.histType}>{i.type.replace("_", " ").toUpperCase()}</Text>
                <Text style={styles.histTime}>{relativeTime(i.created_at)}</Text>
              </View>
              <Text style={styles.histDesc} numberOfLines={2}>{i.description}</Text>
              <View style={styles.histStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.histStatusText}>Status: {i.status}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {toast && (
        <View testID="toast" style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  tabRow: { flexDirection: "row", gap: 8, padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5,
    marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { backgroundColor: theme.colors.surfaceTertiary, color: theme.colors.onSurface,
    borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: 14, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border },
  photosRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  photoThumb: { width: 76, height: 76, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  addPhoto: { width: 76, height: 76, borderRadius: theme.radius.md,
    borderWidth: 2, borderStyle: "dashed", borderColor: theme.colors.border,
    alignItems: "center", justifyContent: "center" },
  sigPad: { padding: 20, backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md,
    borderWidth: 2, borderStyle: "dashed", borderColor: theme.colors.border,
    alignItems: "center", gap: 8 },
  sigPadSigned: { borderStyle: "solid", borderColor: theme.colors.success, backgroundColor: "rgba(16,185,129,0.1)" },
  sigText: { color: theme.colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  histCard: { backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm },
  histHead: { flexDirection: "row", justifyContent: "space-between" },
  histType: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  histTime: { color: theme.colors.onSurfaceTertiary, fontSize: 11 },
  histDesc: { color: theme.colors.onSurface, fontSize: 13, marginTop: 6 },
  histStatus: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.info },
  histStatusText: { color: theme.colors.onSurfaceTertiary, fontSize: 11, textTransform: "capitalize" },
  toast: {
    position: "absolute", bottom: 30, left: theme.spacing.lg, right: theme.spacing.lg,
    flexDirection: "row", gap: 8, alignItems: "center",
    backgroundColor: theme.colors.surfaceTertiary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.success,
  },
  toastText: { color: theme.colors.onSurface, fontWeight: "600", flex: 1 },
});
