import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert, Switch, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, apiUpload } from "@/src/api/client";
import { Button } from "@/src/ui";

const W = {
  bg: "#FFFFFF",
  card: "#F2F2F7",
  border: "#E5E5EA",
  text: "#000000",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  verified: "#30D158",
  danger: "#E13B3B",
};

const STEPS = [
  { key: "documents_uploaded", label: "Upload ID Documents", icon: "document-text-outline" },
  { key: "sin_submitted", label: "Submit SIN", icon: "card-outline" },
  { key: "direct_deposit_submitted", label: "Direct Deposit Info", icon: "cash-outline" },
  { key: "emergency_contact_added", label: "Emergency Contact", icon: "people-outline" },
  { key: "agreements_signed", label: "Sign Employment Agreements", icon: "create-outline" },
];

const DOC_TYPES = [
  { id: "security_licence", label: "Security Licence" },
  { id: "driver_licence", label: "Driver's Licence" },
  { id: "first_aid", label: "First Aid Certificate" },
  { id: "cpr", label: "CPR Certificate" },
  { id: "whmis", label: "WHMIS" },
  { id: "smart_serve", label: "Smart Serve" },
  { id: "photo_id", label: "Government Photo ID" },
];

export default function Onboarding() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Document form
  const [docType, setDocType] = useState("security_licence");
  const [docName, setDocName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docPhoto, setDocPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // SIN form
  const [sin, setSin] = useState("");

  // Direct deposit form
  const [ddInstitution, setDdInstitution] = useState("");
  const [ddTransit, setDdTransit] = useState("");
  const [ddAccount, setDdAccount] = useState("");

  // Emergency contact form
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelation, setEcRelation] = useState("");

  // Agreements
  const [agreed, setAgreed] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/onboarding/status");
      setData(d);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForms = () => {
    setDocType("security_licence");
    setDocName("");
    setDocNumber("");
    setDocExpiry("");
    setDocPhoto(null);
    setSin("");
    setDdInstitution("");
    setDdTransit("");
    setDdAccount("");
    setEcName("");
    setEcPhone("");
    setEcRelation("");
    setAgreed(false);
    setSubmitting(false);
    setUploading(false);
  };

  const openStep = (key: string) => {
    if (data?.status?.[key]) return;
    resetForms();
    setActiveStep(key);
  };

  const closeStep = () => {
    setActiveStep(null);
    resetForms();
  };

  const refresh = async () => {
    setLoading(true);
    await load();
  };

  const submitStep = async (apiPath: string, body: any) => {
    setSubmitting(true);
    try {
      const d = await api(apiPath, { method: "POST", body });
      setData(d);
      closeStep();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save");
    }
    setSubmitting(false);
  };

  const pickDocumentPhoto = async (fromCamera: boolean) => {
    let p: any;
    if (fromCamera) {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) return;
      p = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    } else {
      p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) return;
      p = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    }
    if (p.canceled || !p.assets[0]) return;
    const asset = p.assets[0];
    setDocPhoto({ uri: asset.uri, name: asset.fileName || (fromCamera ? "photo.jpg" : "document.jpg"), type: asset.mimeType || "image/jpeg" });
  };

  const uploadDocument = async (): Promise<string | undefined> => {
    if (!docPhoto) return undefined;
    setUploading(true);
    try {
      const uploaded = await apiUpload<{ url: string; name: string; content_type: string; size: number; kind: string }>(
        "/uploads",
        docPhoto
      );
      setUploading(false);
      return uploaded.url;
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Upload failed", e.message || "Could not upload photo");
      return undefined;
    }
  };

  const submitDocument = async () => {
    if (!docName.trim() || !docNumber.trim() || !docExpiry.trim()) {
      Alert.alert("Required", "Please fill in document name, number and expiry date.");
      return;
    }
    let attachmentUrl: string | undefined;
    if (docPhoto) {
      attachmentUrl = await uploadDocument();
      if (!attachmentUrl) return;
    }
    await submitStep("/onboarding/documents", {
      type: docType,
      name: docName.trim(),
      number: docNumber.trim(),
      expiry: docExpiry.trim(),
      attachment_url: attachmentUrl || undefined,
    });
  };

  const submitSIN = async () => {
    const clean = sin.replace(/\s/g, "");
    if (clean.length < 9) {
      Alert.alert("Invalid SIN", "Please enter a valid 9-digit SIN.");
      return;
    }
    await submitStep("/onboarding/sin", { sin: clean });
  };

  const submitDirectDeposit = async () => {
    if (!ddInstitution.trim() || !ddTransit.trim() || !ddAccount.trim()) {
      Alert.alert("Required", "Please fill in all direct deposit fields.");
      return;
    }
    await submitStep("/onboarding/direct-deposit", {
      institution: ddInstitution.trim(),
      transit: ddTransit.trim(),
      account: ddAccount.trim(),
    });
  };

  const submitEmergencyContact = async () => {
    if (!ecName.trim() || !ecPhone.trim() || !ecRelation.trim()) {
      Alert.alert("Required", "Please fill in all emergency contact fields.");
      return;
    }
    await submitStep("/onboarding/emergency-contact", {
      name: ecName.trim(),
      phone: ecPhone.trim(),
      relation: ecRelation.trim(),
    });
  };

  const submitAgreements = async () => {
    if (!agreed) {
      Alert.alert("Required", "You must agree to the terms to continue.");
      return;
    }
    await submitStep("/onboarding/agreements", { signed: true });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={W.textSecondary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const status = data?.status || {};
  const pct = data?.percent || 0;
  const complete = pct === 100;

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
          {complete && (
            <View style={styles.completeBanner}>
              <Ionicons name="checkmark-circle" size={18} color={W.verified} />
              <Text style={styles.completeText}>Onboarding complete — you're ready to work.</Text>
            </View>
          )}
        </View>

        <View style={styles.stepsList}>
          {STEPS.map((s, i) => {
            const done = status[s.key];
            return (
              <Pressable
                key={s.key}
                testID={`step-${s.key}`}
                onPress={() => openStep(s.key)}
                disabled={done}
                style={[styles.stepRow, i < STEPS.length - 1 && styles.stepRowBorder, done && styles.stepRowDone]}
              >
                <View style={[styles.check, done && styles.checkDone]}>
                  {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : <Ionicons name={s.icon as any} size={13} color={W.textSecondary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepText, done && styles.stepTextDone]}>{s.label}</Text>
                  {done && <Text style={styles.stepSub}>Completed</Text>}
                </View>
                {!done && <Ionicons name="chevron-forward" size={14} color={W.textTertiary} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!activeStep} animationType="slide" transparent onRequestClose={closeStep}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.modalSafe} edges={["top"]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeStep} hitSlop={12} style={styles.modalClose}>
                <Ionicons name="close" size={26} color={W.text} />
              </Pressable>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {STEPS.find((s) => s.key === activeStep)?.label}
              </Text>
              <View style={styles.modalClose} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {activeStep === "documents_uploaded" && (
                <View>
                  <Text style={styles.label}>Document type</Text>
                  <View style={styles.optionRow}>
                    {DOC_TYPES.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => setDocType(t.id)}
                        style={[styles.optionPill, docType === t.id && styles.optionPillActive]}
                      >
                        <Text style={[styles.optionPillText, docType === t.id && styles.optionPillTextActive]}>{t.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.label}>Document name</Text>
                  <TextInput style={styles.input} value={docName} onChangeText={setDocName} placeholder="e.g. Ontario Security Licence" placeholderTextColor={W.textTertiary} />
                  <Text style={styles.label}>Number</Text>
                  <TextInput style={styles.input} value={docNumber} onChangeText={setDocNumber} placeholder="Licence or certificate number" placeholderTextColor={W.textTertiary} />
                  <Text style={styles.label}>Expiry date (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={docExpiry} onChangeText={setDocExpiry} placeholder="2027-12-31" placeholderTextColor={W.textTertiary} />

                  <Text style={styles.label}>Photo / scan</Text>
                  {docPhoto ? (
                    <View style={styles.photoPreview}>
                      <Image source={{ uri: docPhoto.uri }} style={styles.photoThumb} />
                      <Pressable onPress={() => setDocPhoto(null)} style={styles.removePhoto}>
                        <Ionicons name="close-circle" size={22} color={W.danger} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.photoActions}>
                      <Pressable onPress={() => pickDocumentPhoto(false)} style={styles.photoBtn}>
                        <Ionicons name="image-outline" size={18} color={W.text} />
                        <Text style={styles.photoBtnText}>Gallery</Text>
                      </Pressable>
                      <Pressable onPress={() => pickDocumentPhoto(true)} style={styles.photoBtn}>
                        <Ionicons name="camera-outline" size={18} color={W.text} />
                        <Text style={styles.photoBtnText}>Camera</Text>
                      </Pressable>
                    </View>
                  )}
                  {uploading && <ActivityIndicator color={W.accent} style={{ marginVertical: 16 }} />}
                  <Button label={submitting ? "Saving…" : "Submit Document"} onPress={submitDocument} disabled={submitting || uploading} />
                </View>
              )}

              {activeStep === "sin_submitted" && (
                <View>
                  <Text style={styles.label}>Social Insurance Number</Text>
                  <TextInput
                    style={styles.input}
                    value={sin}
                    onChangeText={setSin}
                    placeholder="000 000 000"
                    placeholderTextColor={W.textTertiary}
                    keyboardType="number-pad"
                    maxLength={11}
                  />
                  <Text style={styles.hint}>Your SIN is stored securely and only used for payroll.</Text>
                  <Button label={submitting ? "Saving…" : "Submit SIN"} onPress={submitSIN} disabled={submitting} />
                </View>
              )}

              {activeStep === "direct_deposit_submitted" && (
                <View>
                  <Text style={styles.label}>Institution number</Text>
                  <TextInput style={styles.input} value={ddInstitution} onChangeText={setDdInstitution} placeholder="e.g. 001" placeholderTextColor={W.textTertiary} keyboardType="number-pad" maxLength={3} />
                  <Text style={styles.label}>Transit number</Text>
                  <TextInput style={styles.input} value={ddTransit} onChangeText={setDdTransit} placeholder="e.g. 12345" placeholderTextColor={W.textTertiary} keyboardType="number-pad" maxLength={5} />
                  <Text style={styles.label}>Account number</Text>
                  <TextInput style={styles.input} value={ddAccount} onChangeText={setDdAccount} placeholder="Your account number" placeholderTextColor={W.textTertiary} keyboardType="number-pad" />
                  <Button label={submitting ? "Saving…" : "Save Direct Deposit"} onPress={submitDirectDeposit} disabled={submitting} />
                </View>
              )}

              {activeStep === "emergency_contact_added" && (
                <View>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput style={styles.input} value={ecName} onChangeText={setEcName} placeholder="Contact name" placeholderTextColor={W.textTertiary} />
                  <Text style={styles.label}>Phone</Text>
                  <TextInput style={styles.input} value={ecPhone} onChangeText={setEcPhone} placeholder="+1 416 555 0123" placeholderTextColor={W.textTertiary} keyboardType="phone-pad" />
                  <Text style={styles.label}>Relationship</Text>
                  <TextInput style={styles.input} value={ecRelation} onChangeText={setEcRelation} placeholder="Spouse, parent, sibling…" placeholderTextColor={W.textTertiary} />
                  <Button label={submitting ? "Saving…" : "Save Emergency Contact"} onPress={submitEmergencyContact} disabled={submitting} />
                </View>
              )}

              {activeStep === "agreements_signed" && (
                <View>
                  <Text style={styles.label}>Employment agreements</Text>
                  <View style={styles.agreementBox}>
                    <Text style={styles.agreementText}>
                      By signing below, you confirm that you have read and agree to the Employment Agreement, Confidentiality Agreement, and Workplace Safety Policy. You acknowledge that your security licence is valid and that you will comply with all site-specific instructions and provincial regulations.
                    </Text>
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>I agree to the terms above</Text>
                    <Switch value={agreed} onValueChange={setAgreed} trackColor={{ false: W.border, true: W.accent }} thumbColor="#FFFFFF" />
                  </View>
                  <Button label={submitting ? "Saving…" : "Sign Agreements"} onPress={submitAgreements} disabled={submitting || !agreed} />
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
  completeBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, backgroundColor: "rgba(48,209,88,0.10)", borderRadius: 10, padding: 12 },
  completeText: { color: W.verified, fontSize: 14, fontWeight: "600" },
  stepsList: { backgroundColor: W.card, borderRadius: 10, paddingHorizontal: 16, marginTop: 20 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  stepRowDone: { opacity: 0.8 },
  stepRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: W.border },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: W.border, alignItems: "center", justifyContent: "center", marginRight: 14 },
  checkDone: { backgroundColor: W.text, borderColor: W.text },
  stepText: { color: W.text, fontSize: 15 },
  stepTextDone: { fontWeight: "500" },
  stepSub: { color: W.textTertiary, fontSize: 12, marginTop: 2 },

  modalSafe: { flex: 1, backgroundColor: W.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: W.border },
  modalClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalTitle: { flex: 1, color: W.text, fontSize: 18, fontWeight: "600", textAlign: "center" },
  label: { color: W.text, fontSize: 14, fontWeight: "500", marginTop: 20, marginBottom: 8 },
  hint: { color: W.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 20 },
  input: { backgroundColor: W.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: W.text, fontSize: 15 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: { backgroundColor: W.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 4 },
  optionPillActive: { backgroundColor: W.text },
  optionPillText: { color: W.text, fontSize: 13 },
  optionPillTextActive: { color: "#FFFFFF", fontWeight: "600" },
  photoActions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: W.card, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: W.border },
  photoBtnText: { color: W.text, fontSize: 14, fontWeight: "500" },
  photoPreview: { position: "relative", alignSelf: "flex-start", marginBottom: 20 },
  photoThumb: { width: 120, height: 120, borderRadius: 12 },
  removePhoto: { position: "absolute", top: -6, right: -6, backgroundColor: "#FFFFFF", borderRadius: 12 },
  agreementBox: { backgroundColor: W.card, borderRadius: 12, padding: 14, marginTop: 8 },
  agreementText: { color: W.textSecondary, fontSize: 13, lineHeight: 20 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 20 },
  switchLabel: { color: W.text, fontSize: 15, fontWeight: "500" },
});
