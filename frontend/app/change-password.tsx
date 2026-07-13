import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { success as hapticSuccess } from "@/src/utils/haptics";

// ─── Light palette (matches Profile / Schedule / Settings) ──────────────────
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
};

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  const submit = async () => {
    setError(null);
    if (!currentPassword) { setError("Enter your current password"); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    setSubmitting(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      });
      hapticSuccess();
      Alert.alert("Password updated", "Your password has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      setError(e.message || "Could not update password");
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Change Password</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Current password</Text>
            <TextInput
              testID="current-password-input"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={C.textTertiary}
              style={styles.input}
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput
              testID="new-password-input"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={C.textTertiary}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <TextInput
              testID="confirm-password-input"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={C.textTertiary}
              style={styles.input}
            />
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          testID="submit-password-btn"
          onPress={submit}
          disabled={!canSubmit || submitting}
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
        >
          {submitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.submitBtnText}>Update Password</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: "600" },

  card: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, marginTop: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  field: { paddingVertical: 12 },
  fieldBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  fieldLabel: { color: C.textSecondary, fontSize: 12, marginBottom: 6 },
  input: { color: C.text, fontSize: 15, padding: 0 },

  error: { color: C.red, fontSize: 13, marginBottom: 12, paddingHorizontal: 4 },

  submitBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  submitBtnDisabled: { backgroundColor: C.border },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
