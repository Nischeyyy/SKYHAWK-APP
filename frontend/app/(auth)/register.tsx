import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/auth/AuthContext";

// ── Light-theme palette (auth screens only) ───────────────────────────────────
const W = {
  bg: "#FFFFFF",
  card: "#F2F2F7",
  cardElevated: "#E8E8ED",
  border: "#E5E5EA",
  text: "#000000",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#0A84FF",
  verified: "#30D158",
  danger: "#FF3B30",
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const ROLES = [
  {
    id: "guard",
    label: "Security Guard",
    desc: "I work on-site and in the field",
    icon: "shield-outline" as const,
  },
  {
    id: "supervisor",
    label: "Supervisor",
    desc: "I manage guards and sites",
    icon: "people-outline" as const,
  },
  {
    id: "dispatcher",
    label: "Dispatcher",
    desc: "I assign shifts and coordinate",
    icon: "radio-outline" as const,
  },
  {
    id: "other",
    label: "Other",
    desc: "Different role",
    icon: "person-outline" as const,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hapticLight() {
  if (Platform.OS !== "web") {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }
}
function hapticSuccess() {
  if (Platform.OS !== "web") {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  trailing,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[iStyles.wrap, focused && iStyles.wrapFocused]}>
      <Ionicons
        name={icon}
        size={17}
        color={focused ? W.textSecondary : W.textTertiary}
        style={{ width: 22 }}
      />
      <TextInput
        ref={inputRef}
        style={iStyles.input}
        placeholder={placeholder}
        placeholderTextColor={W.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "none"}
        autoComplete={autoComplete}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={W.accent}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {trailing && <View>{trailing}</View>}
    </View>
  );
}

function ValidationRow({ pass, label }: { pass: boolean; label: string }) {
  return (
    <View style={vStyles.row}>
      <View style={[vStyles.circle, pass && vStyles.circleDone]}>
        {pass && <Ionicons name="checkmark" size={9} color="#fff" />}
      </View>
      <Text style={[vStyles.label, pass && { color: W.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function ProgressDots({ active }: { active: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            i < active && s.dotDone,
            i === active && s.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState(0);

  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [role, setRole] = useState("guard");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resend, setResend] = useState(28);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const successTextOpacity = useRef(new Animated.Value(0)).current;

  // Refs
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const otpRefs = useRef<Array<TextInput | null>>([
    null, null, null, null, null, null,
  ]);

  // Resend countdown
  useEffect(() => {
    if (step !== 2 || resend <= 0) return;
    const t = setInterval(() => setResend((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [step, resend]);

  // Success animation trigger
  useEffect(() => {
    if (step !== 4) return;
    checkScale.setValue(0);
    checkOpacity.setValue(0);
    successTextOpacity.setValue(0);
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 100,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(successTextOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goTo = (next: number, dir: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: -20 * dir,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(next);
      setError(null);
      slideAnim.setValue(20 * dir);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    });
  };

  const goBack = () => {
    hapticLight();
    goTo(step - 1, -1);
  };

  // ── Password validation ───────────────────────────────────────────────────

  const passLen = password.length >= 8;
  const passNum = /\d/.test(password);
  const passSpecial = /[^a-zA-Z0-9]/.test(password);
  const passValid = passLen && passNum && passSpecial;
  const canSubmitAccount =
    name.trim().length > 1 && email.includes("@") && passValid;

  // ── OTP handlers ──────────────────────────────────────────────────────────

  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKey = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = "";
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── Submissions ───────────────────────────────────────────────────────────

  const submitAccount = async () => {
    if (!canSubmitAccount || loading) return;
    setError(null);
    setLoading(true);
    try {
      await register(
        email.trim(),
        password,
        name.trim(),
        phone.trim() || undefined
      );
      hapticLight();
      goTo(2);
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    hapticSuccess();
    router.replace("/(tabs)");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderStep = () => {
    // ── Step 0: Welcome ─────────────────────────────────────────────────────
    if (step === 0) {
      return (
        <View style={s.welcomeWrap}>
          <View style={s.welcomeCenter}>
            <Image
              source={require("../../assets/images/disptchr-hawk.png")}
              style={s.welcomeLogo}
              resizeMode="contain"
            />
            <Text style={s.welcomeTitle}>disptchr</Text>
            <Text style={s.welcomeSub}>Built for Security Companies</Text>
            <Text style={s.welcomeTagline}>
              The all-in-one platform designed to simplify your work and keep
              you connected.
            </Text>
          </View>

          <View style={s.welcomeFooter}>
            <Pressable
              style={s.primaryBtn}
              onPress={() => { hapticLight(); goTo(1); }}
              accessibilityLabel="Get Started"
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnLabel}>Get Started</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              style={s.signInLink}
              accessibilityRole="button"
            >
              <Text style={s.signInLinkText}>
                Already have an account?{" "}
                <Text style={{ color: W.accent }}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // ── Step 1: Create Account ───────────────────────────────────────────────
    if (step === 1) {
      return (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.stepScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ProgressDots active={1} />
            <Text style={s.stepTitle}>Create your account</Text>
            <Text style={s.stepSub}>Let's get you set up.</Text>

            <View style={{ marginTop: 28, gap: 12 }}>
              <IconInput
                icon="person-outline"
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <IconInput
                inputRef={emailRef}
                icon="mail-outline"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              <IconInput
                inputRef={phoneRef}
                icon="call-outline"
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
              />
              <IconInput
                inputRef={pwRef}
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={submitAccount}
                trailing={
                  <Pressable
                    onPress={() => setShowPw((v) => !v)}
                    hitSlop={10}
                    accessibilityLabel={showPw ? "Hide password" : "Show password"}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={showPw ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={W.textTertiary}
                    />
                  </Pressable>
                }
              />
            </View>

            {/* Password rules */}
            <View style={{ marginTop: 16, gap: 7 }}>
              <ValidationRow pass={passLen} label="At least 8 characters" />
              <ValidationRow pass={passNum} label="Include a number" />
              <ValidationRow pass={passSpecial} label="Include a special character" />
            </View>

            {error && <Text style={s.error}>{error}</Text>}

            <Pressable
              style={[
                s.primaryBtn,
                { marginTop: 28 },
                (!canSubmitAccount || loading) && s.primaryBtnDisabled,
              ]}
              onPress={submitAccount}
              disabled={!canSubmitAccount || loading}
              accessibilityLabel="Continue"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmitAccount || loading }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.primaryBtnLabel}>Continue</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    // ── Step 2: Verify Phone ─────────────────────────────────────────────────
    if (step === 2) {
      const otpFull = otp.every((d) => d.length === 1);
      const mm = String(Math.floor(resend / 60)).padStart(2, "0");
      const ss = String(resend % 60).padStart(2, "0");

      return (
        <ScrollView
          contentContainerStyle={s.stepScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressDots active={2} />
          <Text style={s.stepTitle}>Verify your phone</Text>
          <Text style={s.stepSub}>
            Enter the 6-digit code we sent to{"\n"}
            <Text style={{ color: W.text, fontWeight: "600" }}>
              {phone || "+1 416 555 0142"}
            </Text>
          </Text>

          {/* OTP boxes */}
          <View style={s.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { otpRefs.current[i] = r; }}
                style={[s.otpBox, digit && s.otpBoxFilled]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, i)}
                onKeyPress={(e) => handleOtpKey(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectionColor={W.accent}
                accessibilityLabel={`Digit ${i + 1}`}
              />
            ))}
          </View>

          {/* Resend row */}
          <View style={s.resendRow}>
            <Text style={s.resendText}>Didn't receive the code?{" "}</Text>
            {resend > 0 ? (
              <Text style={s.resendTimer}>
                Resend in {mm}:{ss}
              </Text>
            ) : (
              <Pressable
                onPress={() => setResend(28)}
                accessibilityRole="button"
              >
                <Text style={[s.resendTimer, { color: W.accent }]}>
                  Resend
                </Text>
              </Pressable>
            )}
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <View style={{ marginTop: 32, gap: 10 }}>
            <Pressable
              style={[s.primaryBtn, !otpFull && s.primaryBtnDisabled]}
              onPress={() => { hapticLight(); goTo(3); }}
              disabled={!otpFull}
              accessibilityLabel="Verify and Continue"
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnLabel}>Verify & Continue</Text>
            </Pressable>

            <Pressable
              onPress={() => { hapticLight(); goTo(3); }}
              style={s.skipBtn}
              accessibilityRole="button"
            >
              <Text style={s.skipBtnText}>Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }

    // ── Step 3: Role + Terms ─────────────────────────────────────────────────
    if (step === 3) {
      return (
        <ScrollView
          contentContainerStyle={s.stepScroll}
          showsVerticalScrollIndicator={false}
        >
          <ProgressDots active={3} />
          <Text style={s.stepTitle}>Tell us about your role</Text>
          <Text style={s.stepSub}>
            This helps us personalise your experience.
          </Text>

          <View style={{ marginTop: 24, gap: 10 }}>
            {ROLES.map((r) => {
              const selected = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  style={[s.roleCard, selected && s.roleCardSelected]}
                  onPress={() => { hapticLight(); setRole(r.id); }}
                  accessibilityLabel={r.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  {/* Radio */}
                  <View style={[s.radio, selected && s.radioSelected]}>
                    {selected && <View style={s.radioDot} />}
                  </View>
                  {/* Icon badge */}
                  <View style={[s.roleIcon, selected && s.roleIconSelected]}>
                    <Ionicons
                      name={r.icon}
                      size={17}
                      color={selected ? W.accent : W.textSecondary}
                    />
                  </View>
                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.roleLabel,
                        selected && { color: W.text },
                      ]}
                    >
                      {r.label}
                    </Text>
                    <Text style={s.roleDesc}>{r.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Terms */}
          <Pressable
            style={s.termsRow}
            onPress={() => { hapticLight(); setTermsAccepted((v) => !v); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
          >
            <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
              {termsAccepted && (
                <Ionicons name="checkmark" size={11} color="#fff" />
              )}
            </View>
            <Text style={s.termsText}>
              I have read and agree to the{" "}
              <Text style={{ color: W.accent }}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={{ color: W.accent }}>Privacy Policy</Text>
              .
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.primaryBtn,
              { marginTop: 24 },
              !termsAccepted && s.primaryBtnDisabled,
            ]}
            onPress={() => { hapticLight(); goTo(4); }}
            disabled={!termsAccepted}
            accessibilityLabel="Accept and Continue"
            accessibilityRole="button"
          >
            <Text style={s.primaryBtnLabel}>Accept & Continue</Text>
          </Pressable>
        </ScrollView>
      );
    }

    // ── Step 4: All Set ──────────────────────────────────────────────────────
    if (step === 4) {
      return (
        <View style={s.allSetWrap}>
          {/* Animated check circle */}
          <Animated.View
            style={[
              s.checkCircle,
              {
                opacity: checkOpacity,
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>

          {/* Title + subtitle */}
          <Animated.View
            style={{ opacity: successTextOpacity, alignItems: "center" }}
          >
            <Text style={s.allSetTitle}>You're all set!</Text>
            <Text style={s.allSetSub}>
              Your account has been created{"\n"}successfully.
            </Text>
          </Animated.View>

          {/* Button */}
          <Animated.View
            style={[s.allSetBtnWrap, { opacity: successTextOpacity }]}
          >
            <Pressable
              style={s.primaryBtn}
              onPress={goToDashboard}
              accessibilityLabel="Go to Dashboard"
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnLabel}>Go to Dashboard</Text>
            </Pressable>
          </Animated.View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {/* Back button — steps 1–3 only */}
      {step > 0 && step < 4 && (
        <Pressable
          style={s.backBtn}
          onPress={goBack}
          hitSlop={12}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={26} color={W.text} />
        </Pressable>
      )}

      {/* Animated step wrapper */}
      <Animated.View
        style={[
          s.stepWrap,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {renderStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: W.bg },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  stepWrap: { flex: 1 },

  // ── Welcome ──────────────────────────────────────────────────────────────
  welcomeWrap: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 8,
  },
  welcomeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  welcomeLogo: {
    width: 130,
    height: 130,
    marginBottom: 28,
  },
  welcomeTitle: {
    color: W.text,
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1.5,
    marginBottom: 6,
  },
  welcomeSub: {
    color: W.textSecondary,
    fontSize: 16,
    marginBottom: 24,
    letterSpacing: 0.1,
  },
  welcomeTagline: {
    color: W.textTertiary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 260,
  },
  welcomeFooter: {
    paddingBottom: 8,
  },
  signInLink: {
    marginTop: 16,
    padding: 10,
    alignItems: "center",
  },
  signInLinkText: {
    color: W.textSecondary,
    fontSize: 15,
  },

  // ── Step scroll container ─────────────────────────────────────────────────
  stepScroll: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 108 : 72,
    paddingBottom: 48,
  },

  // ── Progress dots ─────────────────────────────────────────────────────────
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    height: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  dotDone: {
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  dotActive: {
    width: 22,
    backgroundColor: W.accent,
    borderRadius: 2,
  },

  // ── Step titles ───────────────────────────────────────────────────────────
  stepTitle: {
    color: W.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginTop: 22,
  },
  stepSub: {
    color: W.textSecondary,
    fontSize: 15,
    marginTop: 7,
    lineHeight: 22,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: "#000000",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.28 },
  primaryBtnLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // ── Skip / link ───────────────────────────────────────────────────────────
  skipBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    color: W.textSecondary,
    fontSize: 15,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  error: {
    color: W.danger,
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── OTP ───────────────────────────────────────────────────────────────────
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 38,
    justifyContent: "center",
  },
  otpBox: {
    width: 46,
    height: 58,
    backgroundColor: W.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: W.border,
    color: W.text,
    fontSize: 24,
    fontWeight: "700",
  },
  otpBoxFilled: {
    borderColor: W.accent,
    backgroundColor: "rgba(10,132,255,0.06)",
  },

  // ── Resend ────────────────────────────────────────────────────────────────
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  resendText: {
    color: W.textTertiary,
    fontSize: 14,
  },
  resendTimer: {
    color: W.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Role cards ────────────────────────────────────────────────────────────
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: W.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: W.border,
  },
  roleCardSelected: {
    borderColor: W.accent,
    backgroundColor: "rgba(10,132,255,0.05)",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: W.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioSelected: { borderColor: W.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: W.accent,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: W.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roleIconSelected: {
    backgroundColor: "rgba(10,132,255,0.10)",
  },
  roleLabel: {
    color: W.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  roleDesc: {
    color: W.textTertiary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 22,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: W.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: W.accent,
    borderColor: W.accent,
  },
  termsText: {
    color: W.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  // ── All Set ───────────────────────────────────────────────────────────────
  allSetWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 0,
  },
  checkCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: W.verified,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    shadowColor: W.verified,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 14,
  },
  allSetTitle: {
    color: W.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    textAlign: "center",
    marginBottom: 12,
  },
  allSetSub: {
    color: W.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  allSetBtnWrap: {
    width: "100%",
    marginTop: 44,
  },
});

// ── Input styles ──────────────────────────────────────────────────────────────

const iStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: W.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: W.border,
    height: 56,
    paddingHorizontal: 16,
    gap: 10,
  },
  wrapFocused: {
    borderColor: "rgba(10,132,255,0.50)",
    backgroundColor: "rgba(10,132,255,0.03)",
  },
  input: {
    flex: 1,
    color: W.text,
    fontSize: 16,
    height: "100%",
  },
});

// ── Validation styles ─────────────────────────────────────────────────────────

const vStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: W.border,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: W.verified,
    borderColor: W.verified,
  },
  label: {
    color: W.textTertiary,
    fontSize: 13,
  },
});
