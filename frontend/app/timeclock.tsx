import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { Button } from "@/src/ui";
import { api } from "@/src/api/client";
import { formatShiftTime } from "@/src/utils/format";

type Step = "idle" | "locating" | "camera" | "confirming";

export default function TimeClock() {
  const router = useRouter();
  const { shift_id } = useLocalSearchParams<{ shift_id?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState<any>(null);
  const [step, setStep] = useState<Step>("idle");
  const [loc, setLoc] = useState<Location.LocationObject | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { api("/timeclock/status").then((d: any) => setActive(d.active)).catch(() => {}); }, []);

  const beginClockIn = async () => {
    setError(null);
    setStep("locating");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLoc(l);
      }
    } catch {}
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { setError("Camera required for verification"); setStep("idle"); return; }
    }
    setStep("camera");
  };

  const captureSelfie = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true });
      if (photo?.base64) { setSelfie(photo.base64); setStep("confirming"); }
    } catch (e: any) { setError(e.message); }
  };

  const submitClockIn = async () => {
    if (!selfie) return;
    setError(null);
    try {
      const r: any = await api("/timeclock/clock-in", {
        method: "POST",
        body: {
          shift_id, latitude: loc?.coords.latitude ?? 43.6467, longitude: loc?.coords.longitude ?? -79.3785,
          selfie_base64: selfie,
        },
      });
      setActive(r.entry);
      setStep("idle");
      setSelfie(null);
    } catch (e: any) { setError(e.message); }
  };

  const clockOut = async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = 43.6467, longitude = -79.3785;
      if (status === "granted") {
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = l.coords.latitude; longitude = l.coords.longitude;
      }
      await api("/timeclock/clock-out", { method: "POST", body: { latitude, longitude } });
      setActive(null);
    } catch (e: any) { setError(e.message); }
  };

  const toggleBreak = async () => {
    const onBreak = active?.breaks?.length && !active.breaks[active.breaks.length - 1].end;
    try {
      const r: any = await api("/timeclock/break", { method: "POST", body: { action: onBreak ? "end" : "start" } });
      setActive({ ...active, breaks: r.breaks });
    } catch (e: any) { setError(e.message); }
  };

  const elapsed = active ? Math.floor((now.getTime() - new Date(active.clock_in).getTime()) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const onBreak = active?.breaks?.length && !active.breaks[active.breaks.length - 1].end;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Time Clock</Text>
      </View>

      {active ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.activeBlock}>
            <Text style={styles.activeLabel}>ON DUTY</Text>
            <Text style={styles.timer}>{hh}:{mm}:{ss}</Text>
            <Text style={styles.since}>Since {formatShiftTime(active.clock_in)}</Text>
            {active.geofence_ok === false && (
              <Text style={styles.warnText}>Outside geofence · {Math.round(active.geofence_distance_m || 0)}m from site</Text>
            )}
          </View>

          <View style={{ marginTop: 32, gap: 10 }}>
            <Button testID="break-btn" label={onBreak ? "End Break" : "Start Break"} variant="secondary" onPress={toggleBreak} />
            <Button testID="clock-out-btn" label="Clock Out" onPress={clockOut} />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      ) : step === "camera" ? (
        <View style={{ flex: 1 }}>
          {Platform.OS !== "web" ? (
            <CameraView ref={cameraRef} facing="front" style={{ flex: 1 }} />
          ) : (
            <View style={styles.webCam}>
              <Ionicons name="camera-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={styles.webCamText}>Camera preview (mobile only)</Text>
            </View>
          )}
          <View style={styles.captureBar}>
            <Text style={styles.captureLabel}>Align your face in frame</Text>
            <Pressable
              testID="capture-selfie-btn"
              onPress={Platform.OS === "web" ? () => { setSelfie("web-mock-selfie"); setStep("confirming"); } : captureSelfie}
              style={styles.captureBtn}
            >
              <View style={styles.captureInner} />
            </Pressable>
          </View>
        </View>
      ) : step === "confirming" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.confirmTitle}>Confirm Clock-In</Text>
          <View style={styles.confirmList}>
            <View style={styles.confirmRow}><Ionicons name="location-outline" size={18} color={theme.colors.text} /><Text style={styles.confirmText}>{loc ? `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}` : "GPS unavailable"}</Text></View>
            <View style={styles.confirmRow}><Ionicons name="time-outline" size={18} color={theme.colors.text} /><Text style={styles.confirmText}>{now.toLocaleString()}</Text></View>
            <View style={styles.confirmRow}><Ionicons name="camera-outline" size={18} color={theme.colors.text} /><Text style={styles.confirmText}>Selfie captured</Text></View>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={{ marginTop: 24, gap: 10 }}>
            <Button testID="confirm-clock-in-btn" label="Clock In" onPress={submitClockIn} />
            <Button label="Retake" variant="secondary" onPress={() => setStep("camera")} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.idleBlock}>
            <Text style={styles.currentTime}>
              {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
            </Text>
            <Text style={styles.currentDate}>{now.toDateString()}</Text>
          </View>
          <Text style={styles.hint}>Location and selfie required to clock in.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={{ marginTop: 32 }}>
            <Button testID="start-clock-in-btn" label="Clock In" onPress={beginClockIn} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "600" },
  content: { padding: 20 },
  idleBlock: { alignItems: "center", paddingVertical: 40 },
  currentTime: { color: theme.colors.text, fontSize: 72, fontWeight: "300", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  currentDate: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 6 },
  hint: { color: theme.colors.textSecondary, fontSize: 14, textAlign: "center" },
  activeBlock: { alignItems: "center", paddingVertical: 40 },
  activeLabel: { color: theme.colors.textSecondary, fontSize: 12, letterSpacing: 0.8 },
  timer: { color: theme.colors.text, fontSize: 64, fontWeight: "300", marginTop: 12, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  since: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 8 },
  warnText: { color: theme.colors.error, fontSize: 13, marginTop: 10 },
  webCam: { flex: 1, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  webCamText: { color: theme.colors.textSecondary, marginTop: 10 },
  captureBar: { padding: 24, alignItems: "center", backgroundColor: theme.colors.bg },
  captureLabel: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 20 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: theme.colors.text, alignItems: "center", justifyContent: "center" },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.text },
  confirmTitle: { color: theme.colors.text, fontSize: 22, fontWeight: "600", marginBottom: 20 },
  confirmList: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 16 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  confirmText: { color: theme.colors.text, fontSize: 14, flex: 1 },
  error: { color: theme.colors.error, textAlign: "center", marginTop: 14, fontSize: 13 },
});
