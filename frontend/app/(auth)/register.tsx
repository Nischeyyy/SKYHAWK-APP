import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";
import { Button, Logo } from "@/src/ui";
import { useAuth } from "@/src/auth/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), phone.trim() || undefined);
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
          <View style={{ alignItems: "center", marginBottom: theme.spacing.xl }}>
            <Logo size={54} />
            <Text style={styles.title}>Start Onboarding</Text>
            <Text style={styles.subtitle}>Create your guard account. Complete steps in-app after signup.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput testID="register-name-input" value={name} onChangeText={setName} style={styles.input}
              placeholder="Jane Doe" placeholderTextColor={theme.colors.onSurfaceTertiary} />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput testID="register-email-input" value={email} onChangeText={setEmail} style={styles.input}
              autoCapitalize="none" keyboardType="email-address"
              placeholder="you@skyhawk.com" placeholderTextColor={theme.colors.onSurfaceTertiary} />
            <Text style={styles.label}>PHONE (OPTIONAL)</Text>
            <TextInput testID="register-phone-input" value={phone} onChangeText={setPhone} style={styles.input}
              keyboardType="phone-pad"
              placeholder="+1 416 555 0000" placeholderTextColor={theme.colors.onSurfaceTertiary} />
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput testID="register-password-input" value={password} onChangeText={setPassword}
              secureTextEntry style={styles.input}
              placeholder="Minimum 6 characters" placeholderTextColor={theme.colors.onSurfaceTertiary} />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button testID="register-submit-button"
              label={loading ? "CREATING..." : "CREATE ACCOUNT"}
              onPress={submit} disabled={loading || !name || !email || !password}
              style={{ marginTop: theme.spacing.xl }} />

            <Button testID="back-to-login-btn" label="BACK TO LOGIN" variant="ghost"
              onPress={() => router.back()} style={{ marginTop: theme.spacing.md }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  container: { padding: theme.spacing.lg, paddingTop: theme.spacing.xl },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.onSurface, marginTop: theme.spacing.md },
  subtitle: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: theme.spacing.xl,
    borderWidth: 1, borderColor: theme.colors.border },
  label: { fontSize: 11, color: theme.colors.onSurfaceTertiary, letterSpacing: 1.5, marginBottom: 6, fontWeight: "700" },
  input: { backgroundColor: theme.colors.surfaceTertiary, color: theme.colors.onSurface,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    fontSize: 15, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  errorBox: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: theme.spacing.md,
    padding: theme.spacing.md, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: theme.radius.sm },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },
});
