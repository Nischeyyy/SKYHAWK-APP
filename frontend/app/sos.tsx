import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  Animated, Vibration, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";

type Phase = "standby" | "confirm" | "sending" | "sent";

export default function SOSScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("standby");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        return { latitude: l.coords.latitude, longitude: l.coords.longitude };
      }
    } catch {}
    return { latitude: 0, longitude: 0 };
  };

  const pressSOS = () => {
    setPhase("confirm");
    if (Platform.OS !== "web") Vibration.vibrate(200);
  };

  const cancelSOS = () => {
    setPhase("standby");
    setMessage("");
    setError(null);
  };

  const sendSOS = async () => {
    setPhase("sending");
    setError(null);
    try {
      const coords = await getLocation();
      await api("/sos", {
        method: "POST",
        body: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          message: message.trim() || undefined,
        },
      });
      if (Platform.OS !== "web") Vibration.vibrate([0, 100, 100, 100]);
      setPhase("sent");
    } catch (e: any) {
      setError(e.message);
      setPhase("confirm");
    }
  };

  if (phase === "sent") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.sentContainer}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.verified} />
          <Text style={styles.sentTitle}>SOS Sent</Text>
          <Text style={styles.sentSub}>
            Your supervisor has been notified with your GPS coordinates. Stay on the line and move to a safe area.
          </Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to App</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Emergency SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {phase === "standby" && (
          <>
            <Text style={styles.hint}>
              Press and hold the button below to send an emergency alert to all supervisors — instantly, with your GPS location.
            </Text>
            <View style={styles.sosWrapper}>
              <Animated.View style={[styles.sosPulse, { transform: [{ scale: pulseAnim }] }]} />
              <Pressable
                onLongPress={pressSOS}
                delayLongPress={800}
                style={styles.sosBtn}
                accessible
                accessibilityLabel="Emergency SOS. Hold to activate."
                accessibilityRole="button"
              >
                <Text style={styles.sosBtnLabel}>SOS</Text>
                <Text style={styles.sosBtnSub}>Hold 1 second</Text>
              </Pressable>
            </View>
            <Text style={styles.footer}>
              This immediately alerts supervisors and auto-files a critical incident report.
            </Text>
          </>
        )}

        {(phase === "confirm" || phase === "sending") && (
          <>
            <View style={styles.confirmBox}>
              <Ionicons name="warning" size={30} color={theme.colors.danger} />
              <Text style={styles.confirmTitle}>Send Emergency Alert?</Text>
              <Text style={styles.confirmSub}>
                All supervisors will be notified instantly with your GPS coordinates and a critical incident will be filed.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. Intruder on floor 3, need backup now"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
              editable={phase !== "sending"}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.confirmActions}>
              {phase === "sending" ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <ActivityIndicator color={theme.colors.danger} size="large" />
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 12, fontSize: 14 }}>Sending alert…</Text>
                </View>
              ) : (
                <>
                  <Pressable style={styles.sendBtn} onPress={sendSOS}>
                    <Ionicons name="alert-circle" size={20} color="#fff" />
                    <Text style={styles.sendBtnText}>Send SOS Now</Text>
                  </Pressable>
                  <Pressable style={styles.cancelBtn} onPress={cancelSOS}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  content: { padding: 24, alignItems: "center", paddingBottom: 60 },
  hint: {
    color: theme.colors.textSecondary, fontSize: 15, textAlign: "center",
    lineHeight: 22, marginBottom: 52, maxWidth: 300,
  },
  sosWrapper: { alignItems: "center", justifyContent: "center", marginBottom: 52 },
  sosPulse: {
    position: "absolute",
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,69,58,0.15)",
  },
  sosBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: theme.colors.danger,
    alignItems: "center", justifyContent: "center",
    shadowColor: theme.colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  sosBtnLabel: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: 1 },
  sosBtnSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 },
  footer: {
    color: theme.colors.textTertiary, fontSize: 13, textAlign: "center",
    lineHeight: 19, maxWidth: 280,
  },
  confirmBox: {
    backgroundColor: "rgba(255,69,58,0.07)",
    borderWidth: 1, borderColor: "rgba(255,69,58,0.28)",
    borderRadius: theme.radius.lg,
    padding: 20, alignItems: "center", gap: 10,
    marginBottom: 28, width: "100%",
  },
  confirmTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  confirmSub: {
    color: theme.colors.textSecondary, fontSize: 14,
    textAlign: "center", lineHeight: 20,
  },
  fieldLabel: {
    color: theme.colors.textSecondary, fontSize: 12,
    textTransform: "uppercase", letterSpacing: 0.6,
    alignSelf: "flex-start", marginBottom: 8,
  },
  messageInput: {
    backgroundColor: theme.colors.card, color: theme.colors.text,
    borderRadius: theme.radius.md, padding: 14, fontSize: 15,
    width: "100%", textAlignVertical: "top", minHeight: 90, marginBottom: 8,
  },
  error: { color: theme.colors.danger, fontSize: 13, textAlign: "center", marginBottom: 12 },
  confirmActions: { width: "100%", gap: 12, marginTop: 12 },
  sendBtn: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { color: theme.colors.textSecondary, fontSize: 16 },
  sentContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, gap: 16 },
  sentTitle: { color: theme.colors.text, fontSize: 32, fontWeight: "700" },
  sentSub: {
    color: theme.colors.textSecondary, fontSize: 16,
    textAlign: "center", lineHeight: 24, marginBottom: 16,
  },
  doneBtn: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: 40, paddingVertical: 14,
  },
  doneBtnText: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
});
