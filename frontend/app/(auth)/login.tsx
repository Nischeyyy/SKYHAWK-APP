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
import { theme } from "@/src/theme";
import { useAuth } from "@/src/auth/AuthContext";

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
            <View style={styles.markContainer}>
              <Image
                source={require("../../assets/images/disptchr-mark.png")}
                style={styles.markImage}
                resizeMode="contain"
              />
            </View>
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
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.input}
              />
              <Pressable style={styles.forgotWrap} onPress={() => {}}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </View>

          {/* ── Sign In button — white / monochrome ── */}
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
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 28, paddingTop: 64, paddingBottom: 48 },

  // Brand
  brandWrap: { alignItems: "center", marginBottom: 20 },
  markContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  markImage: { width: 58, height: 58 },
  wordmark: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
  },

  // Context
  context: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 8,
  },

  // Session banner
  sessionBanner: {
    backgroundColor: "rgba(255,69,58,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.danger,
  },
  sessionText: { color: theme.colors.danger, fontSize: 13, textAlign: "center" },

  // Form
  form: { gap: 8, marginBottom: 28 },
  fieldGroup: { gap: 0 },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
  },
  forgotWrap: { alignSelf: "flex-end", marginTop: 10 },
  forgotText: { color: theme.colors.textSecondary, fontSize: 13 },
  error: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },

  // Sign In button — white, monochrome
  signInBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnDisabled: { backgroundColor: "rgba(255,255,255,0.25)" },
  signInBtnPressed: { opacity: 0.88 },
  signInLabel: { color: "#000000", fontSize: 16, fontWeight: "600" },

  // Footer
  footer: { alignItems: "center", marginTop: 48, gap: 10 },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: theme.colors.divider,
    marginBottom: 6,
  },
  footerLabel: { color: theme.colors.textTertiary, fontSize: 13 },
  footerLink: { color: theme.colors.text, fontSize: 14, fontWeight: "500" },
});
