import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Button, Logo } from "@/src/ui";
import { useAuth } from "@/src/auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("guard@skyhawk.com");
  const [password, setPassword] = useState("Password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const submit = async () => {
    setError(null);
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <Logo size={64} />
            <Text style={styles.brandTitle}>SKYHAWK</Text>
            <Text style={styles.brandSubtitle}>Security Operations</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Guard Login</Text>
            <Text style={styles.subtitle}>Access your shifts, wallet, and operations.</Text>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="you@skyhawk.com"
              placeholderTextColor={theme.colors.onSurfaceTertiary}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.pwWrap}>
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                secureTextEntry={!showPw}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eye} hitSlop={10}>
                <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={theme.colors.onSurfaceTertiary} />
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              testID="login-submit-button"
              label={loading ? "SIGNING IN..." : "SIGN IN"}
              onPress={submit}
              disabled={loading || !email || !password}
              style={{ marginTop: theme.spacing.xl }}
            />

            <Pressable
              testID="go-to-register-link"
              onPress={() => router.push("/(auth)/register")}
              style={{ marginTop: theme.spacing.lg, alignItems: "center" }}
            >
              <Text style={{ color: theme.colors.onSurfaceSecondary, fontSize: 13 }}>
                New guard?  <Text style={{ color: theme.colors.brandPrimary, fontWeight: "700" }}>Start Onboarding</Text>
              </Text>
            </Pressable>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>DEMO CREDENTIALS</Text>
            <Text style={styles.demoText}>guard@skyhawk.com · Password123</Text>
            <Text style={styles.demoText}>admin@skyhawk.com · Admin123</Text>
          </View>
          {loading && <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.brandPrimary} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  container: { padding: theme.spacing.lg, paddingTop: theme.spacing.xxl },
  brandWrap: { alignItems: "center", marginBottom: theme.spacing.xxl },
  brandTitle: {
    fontSize: 30, fontWeight: "900", color: theme.colors.onSurface,
    marginTop: theme.spacing.md, letterSpacing: 4,
  },
  brandSubtitle: {
    color: theme.colors.brandPrimary, fontSize: 12, marginTop: 4,
    letterSpacing: 3, textTransform: "uppercase",
  },
  card: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.onSurface },
  subtitle: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4, marginBottom: theme.spacing.xl },
  label: {
    fontSize: 11, color: theme.colors.onSurfaceTertiary,
    letterSpacing: 1.5, marginBottom: 6, fontWeight: "700",
  },
  input: {
    backgroundColor: theme.colors.surfaceTertiary,
    color: theme.colors.onSurface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  pwWrap: { flexDirection: "row", alignItems: "center", position: "relative" },
  eye: { position: "absolute", right: 12, top: 12, padding: 4 },
  errorBox: {
    flexDirection: "row", gap: 6, alignItems: "center",
    marginTop: theme.spacing.md, padding: theme.spacing.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: theme.radius.sm,
  },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },
  demoBox: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  demoTitle: { color: theme.colors.brandPrimary, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  demoText: { color: theme.colors.onSurfaceSecondary, fontSize: 12, marginTop: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
