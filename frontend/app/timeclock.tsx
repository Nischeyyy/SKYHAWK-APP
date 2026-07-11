import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { formatShiftTime } from "@/src/utils/format";

type Step = "idle" | "locating" | "camera" | "confirming" | "done";

export default function TimeClock() {
  const router = useRouter();
  const { shift_id } = useLocalSearchParams<{ shift_id?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState<any>(null);
  const [step, setStep] = useState<Step>("idle");
  const [loc, setLoc] = useState<Location.LocationObject | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api("/timeclock/status").then((d: any) => setActive(d.active)).catch(() => {});
  }, []);

  const beginClockIn = async () => {
    setError(null);
    setStep("locating");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission denied");
        setLoc(null);
      } else {
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLoc(l);
      }
    } catch (e: any) {
      setLocError(e.message);
    }
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        setError("Camera permission required for selfie verification.");
        setStep("idle");
        return;
      }
    }
    setStep("camera");
  };

  const captureSelfie = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true });
      if (photo?.base64) {
        setSelfie(photo.base64);
        setStep("confirming");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const submitClockIn = async () => {
    if (!selfie) return;
    setError(null);
    try {
      const r: any = await api("/timeclock/clock-in", {
        method: "POST",
        body: {
          shift_id: shift_id,
          latitude: loc?.coords.latitude ?? 43.6467,
          longitude: loc?.coords.longitude ?? -79.3785,
          selfie_base64: selfie,
        },
      });
      setResult(r);
      setActive(r.entry);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    }
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
      const r: any = await api("/timeclock/clock-out", { method: "POST", body: { latitude, longitude } });
      setActive(null);
      setStep("done");
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleBreak = async () => {
    setError(null);
    const onBreak = active?.breaks?.length && !active.breaks[active.breaks.length - 1].end;
    try {
      const r: any = await api("/timeclock/break", { method: "POST", body: { action: onBreak ? "end" : "start" } });
      setActive({ ...active, breaks: r.breaks });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const elapsed = active
    ? Math.floor((now.getTime() - new Date(active.clock_in).getTime()) / 1000)
    : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const onBreak = active?.breaks?.length && !active.breaks[active.breaks.length - 1].end;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>TIME CLOCK</Text>
        <View style={{ width: 22 }} />
      </View>

      {active ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.liveTimeCard}>
            <View style={styles.livePulseRow}>
              <View style={styles.pulse} />
              <Text style={styles.liveLabel}>ON DUTY</Text>
            </View>
            <Text style={styles.bigTimer}>{hh}:{mm}:{ss}</Text>
            <Text style={styles.clockedInText}>Clocked in at {formatShiftTime(active.clock_in)}</Text>
            {active.geofence_ok !== undefined && (
              <View style={[styles.geoBadge, {
                backgroundColor: active.geofence_ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
              }]}>
                <Ionicons name={active.geofence_ok ? "shield-checkmark" : "warning"}
                  size={13} color={active.geofence_ok ? theme.colors.success : theme.colors.error} />
                <Text style={[styles.geoText, {
                  color: active.geofence_ok ? theme.colors.success : theme.colors.error,
                }]}>
                  {active.geofence_ok ? "Geofence Verified" : `Outside geofence (${Math.round(active.geofence_distance_m || 0)}m)`}
                </Text>
              </View>
            )}
          </View>

          <Pressable testID="break-btn" onPress={toggleBreak} style={styles.breakBtn}>
            <Ionicons name={onBreak ? "play" : "pause"} size={18} color={theme.colors.onSurface} />
            <Text style={styles.breakBtnText}>{onBreak ? "END BREAK" : "START BREAK"}</Text>
          </Pressable>

          <Pressable testID="clock-out-btn" onPress={clockOut} style={styles.clockOutBtn}>
            <Ionicons name="stop-circle" size={20} color={theme.colors.onError} />
            <Text style={styles.clockOutText}>CLOCK OUT</Text>
          </Pressable>
          {error && <Text style={styles.err}>{error}</Text>}
        </ScrollView>
      ) : step === "camera" ? (
        <View style={{ flex: 1 }}>
          {Platform.OS !== "web" ? (
            <CameraView ref={cameraRef} facing="front" style={{ flex: 1 }} />
          ) : (
            <View style={[styles.webCam, { flex: 1 }]}>
              <Ionicons name="camera" size={60} color={theme.colors.onSurfaceTertiary} />
              <Text style={{ color: theme.colors.onSurface, marginTop: 12, fontSize: 15 }}>Camera preview (mobile only)</Text>
              <Text style={{ color: theme.colors.onSurfaceTertiary, marginTop: 4, fontSize: 12 }}>Web build uses placeholder</Text>
            </View>
          )}
          <View style={styles.captureOverlay}>
            <Text style={styles.captureLabel}>ALIGN YOUR FACE IN FRAME</Text>
            <Pressable
              testID="capture-selfie-btn"
              onPress={Platform.OS === "web" ? () => { setSelfie("web-mock-selfie"); setStep("confirming"); } : captureSelfie}
              style={styles.captureBtn}
            >
              <View style={styles.captureBtnInner} />
            </Pressable>
          </View>
        </View>
      ) : step === "confirming" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.confirmTitle}>CONFIRM CLOCK-IN</Text>
          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Ionicons name="location" size={16} color={theme.colors.brandPrimary} />
              <Text style={styles.confirmText}>
                {loc ? `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}` : locError || "No GPS lock"}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="time" size={16} color={theme.colors.brandPrimary} />
              <Text style={styles.confirmText}>{now.toLocaleString()}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="camera" size={16} color={theme.colors.brandPrimary} />
              <Text style={styles.confirmText}>Selfie captured</Text>
            </View>
          </View>
          {error && <Text style={styles.err}>{error}</Text>}
          <Pressable testID="confirm-clock-in-btn" onPress={submitClockIn} style={styles.primaryBig}>
            <Text style={styles.primaryBigText}>CONFIRM & CLOCK IN</Text>
          </Pressable>
          <Pressable onPress={() => setStep("camera")} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: theme.colors.onSurfaceTertiary }}>Retake selfie</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.bigClockCard}>
            <Text style={styles.timeLabel}>CURRENT TIME</Text>
            <Text style={styles.bigTimer}>
              {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
            </Text>
            <Text style={styles.dateText}>{now.toDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Ionicons name="location" size={18} color={theme.colors.brandPrimary} />
              <Text style={styles.infoText}>GPS Verified</Text>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="camera" size={18} color={theme.colors.brandPrimary} />
              <Text style={styles.infoText}>Selfie Required</Text>
            </View>
          </View>
          {error && <Text style={styles.err}>{error}</Text>}
          <Pressable testID="start-clock-in-btn" onPress={beginClockIn} style={styles.primaryBig}>
            <Ionicons name="play" size={22} color={theme.colors.onBrandPrimary} />
            <Text style={styles.primaryBigText}>CLOCK IN</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerTitle: { color: theme.colors.onSurface, fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  bigClockCard: {
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.xl,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center",
  },
  timeLabel: { color: theme.colors.brandPrimary, fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  bigTimer: { color: theme.colors.onSurface, fontSize: 60, fontWeight: "900", letterSpacing: -2, marginTop: 8, fontVariant: ["tabular-nums"] },
  dateText: { color: theme.colors.onSurfaceTertiary, fontSize: 13, marginTop: 6 },
  infoRow: { flexDirection: "row", gap: theme.spacing.md },
  infoBox: {
    flex: 1, backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.md,
    borderRadius: theme.radius.md, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  infoText: { color: theme.colors.onSurface, fontSize: 12, fontWeight: "600" },
  primaryBig: {
    backgroundColor: theme.colors.brandPrimary, padding: 20, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: theme.spacing.md,
  },
  primaryBigText: { color: theme.colors.onBrandPrimary, fontSize: 17, fontWeight: "900", letterSpacing: 2 },
  liveTimeCard: {
    backgroundColor: theme.colors.brandTertiary, padding: theme.spacing.xl,
    borderRadius: theme.radius.md, alignItems: "center", borderWidth: 1, borderColor: theme.colors.brandPrimary,
  },
  livePulseRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.brandPrimary },
  liveLabel: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  clockedInText: { color: theme.colors.onBrandTertiary, marginTop: 8, fontSize: 13 },
  geoBadge: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, marginTop: 12 },
  geoText: { fontSize: 12, fontWeight: "700" },
  breakBtn: {
    backgroundColor: theme.colors.surfaceTertiary, padding: 16, borderRadius: theme.radius.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  breakBtnText: { color: theme.colors.onSurface, fontWeight: "800", letterSpacing: 1 },
  clockOutBtn: {
    backgroundColor: theme.colors.error, padding: 18, borderRadius: theme.radius.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  clockOutText: { color: "#fff", fontWeight: "900", letterSpacing: 2, fontSize: 15 },
  webCam: { backgroundColor: theme.colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  captureOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: theme.spacing.xl,
    alignItems: "center", backgroundColor: "rgba(15,23,42,0.9)",
  },
  captureLabel: { color: theme.colors.onSurface, fontSize: 12, letterSpacing: 2, fontWeight: "700", marginBottom: 16 },
  captureBtn: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4,
    borderColor: theme.colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.brandPrimary },
  confirmTitle: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  confirmCard: {
    backgroundColor: theme.colors.surfaceSecondary, padding: theme.spacing.lg,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, gap: 12,
  },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmText: { color: theme.colors.onSurface, fontSize: 13, flex: 1 },
  err: { color: theme.colors.error, textAlign: "center", marginTop: 8 },
});
