import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { useAuth } from "@/src/auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("guard@skyhawk.com");
  const [password, setPassword] = useState("Password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>Skyhawk</Text>
            <Text style={styles.brandSub}>Security Operations</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.input}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={{ marginTop: theme.spacing.xl }}>
              <Button testID="login-submit-button" label={loading ? "Signing in…" : "Sign In"} onPress={submit} disabled={loading || !email || !password} />
            </View>
            <Pressable
              testID="go-to-register-link"
              onPress={() => router.push("/(auth)/register")}
              style={{ marginTop: theme.spacing.lg, alignItems: "center", padding: 10 }}
            >
              <Text style={styles.regLink}>New guard? Start Onboarding</Text>
            </Pressable>
          </View>

          <Text style={styles.demoText}>Demo: guard@skyhawk.com · Password123</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 60 },
  brandWrap: { alignItems: "center", marginBottom: 60 },
  brand: { color: theme.colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  brandSub: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  form: {},
  label: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: 16,
  },
  error: { color: theme.colors.error, fontSize: 13, marginTop: 12, textAlign: "center" },
  regLink: { color: theme.colors.textSecondary, fontSize: 14 },
  demoText: { color: theme.colors.textTertiary, fontSize: 12, textAlign: "center", marginTop: 40, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
