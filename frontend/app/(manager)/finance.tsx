import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Modal, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { StatusPill, Button, Avatar } from "@/src/ui";
import { formatDate, formatShiftTime, formatCurrency, relativeTime } from "@/src/utils/format";

type FinanceTab = "payroll" | "timeclock";
const PAYROLL_STATUSES = ["submitted", "under_review", "released", "paid"];

export default function FinanceScreen() {
  const [tab, setTab] = useState<FinanceTab>("payroll");
  const [payroll, setPayroll] = useState<any[]>([]);
  const [timeclock, setTimeclock] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payroll create modal
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [payrollForm, setPayrollForm] = useState({ user_id: "", period_start: "", period_end: "", pay_date: "", hours_regular: "", hours_overtime: "0", pay_rate: "24.50" });

  // Payroll status modal
  const [editPayroll, setEditPayroll] = useState<any>(null);
  const [payrollStatus, setPayrollStatus] = useState("submitted");

  // Timeclock adjust modal
  const [editClock, setEditClock] = useState<any>(null);
  const [clockForm, setClockForm] = useState({ clock_in: "", clock_out: "", hours_worked: "" });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pv, tv, gv] = await Promise.all([
        api("/admin/payroll"),
        api("/admin/timeclock"),
        api("/admin/guards"),
      ]);
      setPayroll(pv.periods ?? []);
      setTimeclock(tv.entries ?? []);
      setGuards(gv.guards ?? []);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const createPayroll = async () => {
    if (!payrollForm.user_id || !payrollForm.period_start || !payrollForm.period_end || !payrollForm.hours_regular) {
      Alert.alert("Required", "Guard, period dates and hours are required."); return;
    }
    setSaving(true);
    try {
      await api("/admin/payroll", { method: "POST", body: { ...payrollForm, hours_regular: parseFloat(payrollForm.hours_regular), hours_overtime: parseFloat(payrollForm.hours_overtime), pay_rate: parseFloat(payrollForm.pay_rate) } });
      await load();
      setShowPayrollForm(false);
      setPayrollForm({ user_id: "", period_start: "", period_end: "", pay_date: "", hours_regular: "", hours_overtime: "0", pay_rate: "24.50" });
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const updatePayrollStatus = async () => {
    if (!editPayroll) return;
    setSaving(true);
    try {
      await api(`/admin/payroll/${editPayroll.id}`, { method: "PUT", body: { status: payrollStatus } });
      await load();
      setEditPayroll(null);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const openAdjustClock = (entry: any) => {
    setEditClock(entry);
    setClockForm({
      clock_in: entry.clock_in?.slice(0, 16) ?? "",
      clock_out: entry.clock_out?.slice(0, 16) ?? "",
      hours_worked: entry.hours_worked != null ? String(entry.hours_worked) : "",
    });
  };

  const adjustClock = async () => {
    if (!editClock) return;
    setSaving(true);
    try {
      const body: any = {};
      if (clockForm.clock_in) body.clock_in = clockForm.clock_in;
      if (clockForm.clock_out) body.clock_out = clockForm.clock_out;
      if (clockForm.hours_worked) body.hours_worked = parseFloat(clockForm.hours_worked);
      await api(`/admin/timeclock/${editClock.id}`, { method: "PUT", body });
      await load();
      setEditClock(null);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const payrollStatusTone = (s: string) => s === "paid" ? "verified" : s === "released" ? "accent" : s === "under_review" ? "warning" : "neutral";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Finance</Text>
        {tab === "payroll" && (
          <Pressable onPress={() => setShowPayrollForm(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color={theme.colors.accent} />
            <Text style={styles.addBtnText}>New</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.tabBar}>
        {([["payroll", "Payroll"], ["timeclock", "Timeclock"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tabItem, tab === key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
        : <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}>

            {/* PAYROLL */}
            {tab === "payroll" && (payroll.length === 0
              ? <Text style={styles.emptyText}>No payroll records.</Text>
              : payroll.map(p => (
                <Pressable key={p.id} style={styles.card} onPress={() => { setEditPayroll(p); setPayrollStatus(p.status); }}>
                  <View style={styles.cardRow}>
                    <Avatar name={p.user?.full_name} size={40} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{p.user?.full_name ?? "—"}</Text>
                      <Text style={styles.cardMeta}>{p.period_start?.slice(0, 10)} → {p.period_end?.slice(0, 10)}</Text>
                      <Text style={styles.cardMeta}>{p.hours_regular}h reg{p.hours_overtime > 0 ? ` · ${p.hours_overtime}h OT` : ""}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={styles.grossText}>{formatCurrency(p.gross)}</Text>
                      <StatusPill label={p.status} tone={payrollStatusTone(p.status)} />
                    </View>
                  </View>
                </Pressable>
              ))
            )}

            {/* TIMECLOCK */}
            {tab === "timeclock" && (timeclock.length === 0
              ? <Text style={styles.emptyText}>No timeclock entries.</Text>
              : timeclock.map(e => (
                <View key={e.id} style={[styles.card, !e.clock_out && styles.cardActive]}>
                  <View style={styles.cardRow}>
                    <Avatar name={e.user?.full_name} size={40} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{e.user?.full_name ?? "—"}</Text>
                      <Text style={styles.cardMeta}>{e.site?.name ?? "Unknown site"}</Text>
                      <Text style={styles.cardMeta}>In: {e.clock_in ? formatShiftTime(e.clock_in) : "—"} · Out: {e.clock_out ? formatShiftTime(e.clock_out) : <Text style={{ color: theme.colors.verified }}>Active</Text>}</Text>
                      {e.hours_worked != null && <Text style={styles.cardMeta}>{e.hours_worked}h worked</Text>}
                      {!e.geofence_ok && <Text style={[styles.cardMeta, { color: theme.colors.warning }]}>⚠ Outside geofence ({Math.round(e.geofence_distance_m ?? 0)}m)</Text>}
                      {e.manually_adjusted && <Text style={[styles.cardMeta, { color: theme.colors.textTertiary }]}>Manually adjusted</Text>}
                    </View>
                    <Pressable onPress={() => openAdjustClock(e)} style={styles.iconBtn}>
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.accent} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
      }

      {/* Create Payroll Modal */}
      <Modal visible={showPayrollForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPayrollForm(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPayrollForm(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>New Payroll Record</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Guard *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {guards.filter(g => g.role === "employee").map(g => (
                      <Pressable key={g.id} onPress={() => setPayrollForm(f => ({ ...f, user_id: g.id }))} style={[styles.optionPill, payrollForm.user_id === g.id && styles.optionPillActive]}>
                        <Text style={[styles.optionPillText, payrollForm.user_id === g.id && { color: theme.colors.accent }]}>{g.full_name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
              {[
                ["Period Start (YYYY-MM-DD) *", "period_start"],
                ["Period End (YYYY-MM-DD) *", "period_end"],
                ["Pay Date (YYYY-MM-DD)", "pay_date"],
                ["Regular Hours *", "hours_regular"],
                ["Overtime Hours", "hours_overtime"],
                ["Pay Rate ($/hr)", "pay_rate"],
              ].map(([label, key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={(payrollForm as any)[key]} onChangeText={v => setPayrollForm(f => ({ ...f, [key]: v }))} keyboardType={["hours_regular", "hours_overtime", "pay_rate"].includes(key) ? "decimal-pad" : "default"} autoCapitalize="none" placeholderTextColor={theme.colors.textTertiary} />
                </View>
              ))}
              <Button label={saving ? "Creating…" : "Create Record"} onPress={createPayroll} disabled={saving} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Update Payroll Status Modal */}
      <Modal visible={!!editPayroll} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditPayroll(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditPayroll(null)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>Update Payroll</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {editPayroll && (
              <View style={styles.payrollDetailCard}>
                <Text style={styles.payrollGuardName}>{editPayroll.user?.full_name}</Text>
                <Text style={styles.payrollPeriod}>{editPayroll.period_start?.slice(0, 10)} → {editPayroll.period_end?.slice(0, 10)}</Text>
                <View style={styles.payrollAmounts}>
                  <View style={styles.payrollAmountItem}>
                    <Text style={styles.payrollAmountLabel}>Gross</Text>
                    <Text style={styles.payrollAmountValue}>{formatCurrency(editPayroll.gross)}</Text>
                  </View>
                  <View style={styles.payrollAmountItem}>
                    <Text style={styles.payrollAmountLabel}>Net</Text>
                    <Text style={[styles.payrollAmountValue, { color: theme.colors.verified }]}>{formatCurrency(editPayroll.net)}</Text>
                  </View>
                  <View style={styles.payrollAmountItem}>
                    <Text style={styles.payrollAmountLabel}>Hours</Text>
                    <Text style={styles.payrollAmountValue}>{editPayroll.hours_regular + editPayroll.hours_overtime}h</Text>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.optionRow}>
                {PAYROLL_STATUSES.map(s => (
                  <Pressable key={s} onPress={() => setPayrollStatus(s)} style={[styles.optionPill, payrollStatus === s && styles.optionPillActive]}>
                    <Text style={[styles.optionPillText, payrollStatus === s && { color: theme.colors.accent }]}>{s.replace("_", " ")}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Button label={saving ? "Saving…" : "Update Status"} onPress={updatePayrollStatus} disabled={saving} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Adjust Timeclock Modal */}
      <Modal visible={!!editClock} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditClock(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditClock(null)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>Adjust Timeclock</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {editClock && (
                <View style={[styles.payrollDetailCard, { marginBottom: 20 }]}>
                  <Text style={styles.payrollGuardName}>{editClock.user?.full_name}</Text>
                  <Text style={styles.payrollPeriod}>{editClock.site?.name}</Text>
                  {!editClock.geofence_ok && <Text style={[styles.payrollPeriod, { color: theme.colors.warning, marginTop: 4 }]}>⚠ Clocked in {Math.round(editClock.geofence_distance_m ?? 0)}m outside geofence</Text>}
                </View>
              )}
              {[
                ["Clock In (YYYY-MM-DDTHH:MM)", "clock_in"],
                ["Clock Out (YYYY-MM-DDTHH:MM)", "clock_out"],
                ["Hours Worked (override)", "hours_worked"],
              ].map(([label, key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={(clockForm as any)[key]} onChangeText={v => setClockForm(f => ({ ...f, [key]: v }))} keyboardType={key === "hours_worked" ? "decimal-pad" : "default"} autoCapitalize="none" placeholderTextColor={theme.colors.textTertiary} />
                </View>
              ))}
              <Button label={saving ? "Saving…" : "Save Adjustments"} onPress={adjustClock} disabled={saving} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(10,132,255,0.12)", borderRadius: theme.radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: theme.colors.accent, fontSize: 14, fontWeight: "600" },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 4, gap: 4 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: theme.radius.md, alignItems: "center" },
  tabItemActive: { backgroundColor: theme.colors.cardElevated },
  tabLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  tabLabelActive: { color: theme.colors.text, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  cardActive: { borderColor: theme.colors.verified },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1 },
  cardName: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  grossText: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  iconBtn: { padding: 8, backgroundColor: theme.colors.cardElevated, borderRadius: 8 },
  emptyText: { textAlign: "center", color: theme.colors.textTertiary, marginTop: 40, fontSize: 15 },
  payrollDetailCard: { backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.lg, padding: 16, marginBottom: 24 },
  payrollGuardName: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  payrollPeriod: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  payrollAmounts: { flexDirection: "row", marginTop: 16, gap: 16 },
  payrollAmountItem: { flex: 1, alignItems: "center" },
  payrollAmountLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
  payrollAmountValue: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  // Modal
  modalSafe: { flex: 1, backgroundColor: theme.colors.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  closeBtn: { width: 60 },
  modalTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  modalContent: { padding: 20, paddingBottom: 60 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldInput: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionPillActive: { borderColor: theme.colors.accent },
  optionPillText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
});
