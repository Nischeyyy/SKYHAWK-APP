import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { DeadText } from "@/src/components/DeadButton";

// ── Light-theme palette (auth screens only) ───────────────────────────────────
const W = {
  bg: "#FFFFFF",
  input: "#F2F2F7",
  border: "#E5E5EA",
  text: "#000000",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  danger: "#FF3B30",
};

export default function Login() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    clearSessionExpired();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Brand ── */}
          <View style={styles.brandWrap}>
            <Image
              source={require("../../assets/images/disptchr-hawk.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.wordmark}>disptchr</Text>
          </View>

          {/* ── Context ── */}
          <Text style={styles.context}>
            Access your shifts, payroll and credentials.
          </Text>

          {/* ── Session expired ── */}
          {sessionExpired && (
            <View style={styles.sessionBanner}>
              <Text style={styles.sessionText}>
                Your session expired. Please sign in again.
              </Text>
            </View>
          )}

          {/* ── Form ── */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={W.textTertiary}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={W.textTertiary}
                style={styles.input}
              />
              <Pressable style={styles.forgotWrap} onPress={() => {}}>
                <DeadText style={styles.forgotText}>Forgot Password?</DeadText>
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </View>

          {/* ── Sign In button ── */}
          <Pressable
            testID="login-submit-button"
            onPress={submit}
            disabled={loading || !email || !password}
            style={({ pressed }) => [
              styles.signInBtn,
              (loading || !email || !password) && styles.signInBtnDisabled,
              pressed && styles.signInBtnPressed,
            ]}
          >
            <Text style={styles.signInLabel}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </Pressable>

          {/* ── Onboarding link ── */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <Text style={styles.footerLabel}>Don't have an account?</Text>
            <Pressable
              testID="go-to-register-link"
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.footerLink}>Create Employee Account →</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: W.bg },
  container: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 48 },

  // Brand
  brandWrap: { alignItems: "center", marginBottom: 18 },
  logo: { width: 120, height: 120 },
  wordmark: {
    color: W.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 8,
  },

  // Context
  context: {
    color: W.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 8,
  },

  // Session banner
  sessionBanner: {
    backgroundColor: "rgba(255,59,48,0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: W.danger,
  },
  sessionText: { color: W.danger, fontSize: 13, textAlign: "center" },

  // Form
  form: { gap: 8, marginBottom: 28 },
  fieldGroup: { gap: 0 },
  label: {
    color: W.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: W.input,
    color: W.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: W.border,
  },
  forgotWrap: { alignSelf: "flex-end", marginTop: 10 },
  forgotText: { color: W.textSecondary, fontSize: 13 },
  error: {
    color: W.danger,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },

  // Sign In button — black, monochrome
  signInBtn: {
    backgroundColor: "#000000",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnDisabled: { backgroundColor: "#D1D1D6" },
  signInBtnPressed: { opacity: 0.88 },
  signInLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  // Footer
  footer: { alignItems: "center", marginTop: 48, gap: 10 },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: W.border,
    marginBottom: 6,
  },
  footerLabel: { color: W.textTertiary, fontSize: 13 },
  footerLink: { color: W.text, fontSize: 14, fontWeight: "500" },
});
