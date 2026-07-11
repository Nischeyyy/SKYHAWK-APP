import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { useAuth } from "@/src/auth/AuthContext";

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
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Complete remaining onboarding steps in-app after signup.</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput testID="register-name-input" value={name} onChangeText={setName} style={styles.input} />

          <Text style={styles.label}>Email</Text>
          <TextInput testID="register-email-input" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput testID="register-phone-input" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

          <Text style={styles.label}>Password</Text>
          <TextInput testID="register-password-input" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={{ marginTop: theme.spacing.xl, gap: 10 }}>
            <Button testID="register-submit-button" label={loading ? "Creating…" : "Create Account"} onPress={submit} disabled={loading || !name || !email || !password} />
            <Button testID="back-to-login-btn" label="Back to Login" variant="secondary" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: { padding: 24, paddingTop: 40 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 20 },
  label: { color: theme.colors.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.radius.md, padding: 14, fontSize: 16 },
  error: { color: theme.colors.error, fontSize: 13, marginTop: 12, textAlign: "center" },
});
