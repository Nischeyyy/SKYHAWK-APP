import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/auth/AuthContext";

function ToggleRow({ icon, label, value, onChange, last }: { icon: any; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={19} color={theme.colors.text} style={{ marginRight: 14 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function NavRow({ icon, label, onPress, last, danger, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={19} color={danger ? theme.colors.danger : theme.colors.text} style={{ marginRight: 14 }} />
      <Text style={[styles.rowLabel, danger && { color: theme.colors.danger }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <ToggleRow icon="notifications-outline" label="Push Notifications" value={pushEnabled} onChange={setPushEnabled} />
          <ToggleRow icon="location-outline" label="Shift Location Tracking" value={locationEnabled} onChange={setLocationEnabled} last />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <NavRow testID="go-employment" icon="briefcase-outline" label="Employment Details" onPress={() => router.push("/employment")} />
          <NavRow testID="go-payroll" icon="cash-outline" label="Payroll" onPress={() => router.push("/payroll")} last />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="information-circle-outline" size={19} color={theme.colors.text} style={{ marginRight: 14 }} />
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={[styles.row]}>
            <Ionicons name="mail-outline" size={19} color={theme.colors.text} style={{ marginRight: 14 }} />
            <Text style={styles.rowLabel}>Signed in as</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{user?.email || "—"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <NavRow testID="settings-logout-btn" icon="log-out-outline" label="Sign Out" onPress={logout} last danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },

  sectionLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500", marginTop: 20, marginBottom: 8 },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  rowLabel: { flex: 1, color: theme.colors.text, fontSize: 15 },
  rowValue: { color: theme.colors.textSecondary, fontSize: 13, maxWidth: 180 },
});
