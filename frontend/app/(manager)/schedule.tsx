import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Modal, Pressable, TextInput,
  ScrollView, RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { StatusPill, Button } from "@/src/ui";
import { formatDate, formatShiftTime, formatCurrency } from "@/src/utils/format";

type Tab = "assigned" | "open";
const ROLES = ["Patrol", "Concierge Security", "Event Security", "K9 Support", "Access Control"];

function splitDatetime(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const [d, t = ""] = iso.slice(0, 16).split("T");
  return { date: d, time: t };
}
function joinDatetime(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("assigned");
  const [shifts, setShifts] = useState<any[]>([]);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [pendingSwaps, setPendingSwaps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guardFilter, setGuardFilter] = useState<string>("");

  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"assigned" | "open">("assigned");
  const [form, setForm] = useState({
    user_id: "", site_id: "",
    startDate: "", startTime: "",
    endDate: "", endTime: "",
    role: "Patrol", pay_rate: "24.50", spots_available: "1", urgent: false, notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const [editShift, setEditShift] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const [sv, ov, gv, sitv, swapv] = await Promise.all([
        api("/admin/shifts"),
        api("/admin/open-shifts"),
        api("/admin/guards"),
        api("/admin/sites"),
        api("/admin/shift-swaps?status=accepted"),
      ]);
      setShifts(sv.shifts ?? []);
      setOpenShifts(ov.shifts ?? []);
      setGuards(gv.guards ?? []);
      setSites(sitv.sites ?? []);
      setPendingSwaps((swapv.swaps ?? []).length);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const createShift = async () => {
    const start = joinDatetime(form.startDate, form.startTime);
    const end = joinDatetime(form.endDate, form.endTime);
    if (!form.site_id || !start || !end) { Alert.alert("Required", "Site, start and end are required."); return; }
    if (createType === "assigned" && !form.user_id) { Alert.alert("Required", "Please select a guard."); return; }
    if (new Date(start) >= new Date(end)) { Alert.alert("Invalid", "End must be after start."); return; }
    setSaving(true);
    setConflictMsg(null);
    try {
      if (createType === "assigned") {
        await api("/admin/shifts", { method: "POST", body: { user_id: form.user_id, site_id: form.site_id, start, end, role: form.role, pay_rate: parseFloat(form.pay_rate), notes: form.notes || undefined } });
      } else {
        await api("/admin/open-shifts", { method: "POST", body: { site_id: form.site_id, start, end, role: form.role, pay_rate: parseFloat(form.pay_rate), spots_available: parseInt(form.spots_available), urgent: form.urgent } });
      }
      await load();
      setShowCreate(false);
      setForm({ user_id: "", site_id: "", startDate: "", startTime: "", endDate: "", endTime: "", role: "Patrol", pay_rate: "24.50", spots_available: "1", urgent: false, notes: "" });
    } catch (e: any) {
      if (e.status === 409 || (e.message && e.message.includes("conflict"))) {
        setConflictMsg(e.message);
      } else {
        Alert.alert("Error", e.message);
      }
    }
    setSaving(false);
  };

  const deleteShift = async (id: string, isOpen = false) => {
    Alert.alert("Delete Shift", "This will remove the shift. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api(`/admin/${isOpen ? "open-shifts" : "shifts"}/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("Error", e.message); }
      }},
    ]);
  };

  const openEdit = (shift: any) => {
    const { date: sd, time: st } = splitDatetime(shift.start);
    const { date: ed, time: et } = splitDatetime(shift.end);
    setEditShift(shift);
    setEditForm({ startDate: sd, startTime: st, endDate: ed, endTime: et, role: shift.role ?? "Patrol", pay_rate: String(shift.pay_rate ?? "24.50"), status: shift.status ?? "scheduled", notes: shift.notes ?? "" });
  };

  const saveEdit = async () => {
    if (!editShift) return;
    const start = joinDatetime(editForm.startDate, editForm.startTime);
    const end = joinDatetime(editForm.endDate, editForm.endTime);
    setSaving(true);
    try {
      await api(`/admin/shifts/${editShift.id}`, { method: "PUT", body: { ...{ role: editForm.role, pay_rate: parseFloat(editForm.pay_rate), status: editForm.status, notes: editForm.notes || undefined }, ...(start ? { start } : {}), ...(end ? { end } : {}) } });
      await load();
      setEditShift(null);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const statusTone = (s: string) => s === "completed" ? "verified" : s === "scheduled" ? "accent" : "neutral";

  const filteredShifts = guardFilter
    ? shifts.filter(s => s.user?.full_name?.toLowerCase().includes(guardFilter.toLowerCase()))
    : shifts;

  const renderShift = ({ item: s }: any) => (
    <View style={styles.shiftCard}>
      <View style={[styles.shiftAccent, { backgroundColor: s.status === "completed" ? "#22C55E" : s.status === "cancelled" ? "#EF4444" : "#3B82F6" }]} />
      <View style={styles.shiftCardInner}>
        <View style={styles.shiftInfo}>
          <Text style={styles.shiftSite}>{s.site?.name ?? "—"}</Text>
          <Text style={styles.shiftTime}>{formatDate(s.start)} · {formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
          <Text style={styles.shiftMeta}>{s.role} · {s.user?.full_name ?? "Unassigned"} · {formatCurrency(s.pay_rate)}/h</Text>
          {s.notes ? <Text style={styles.shiftNotes} numberOfLines={1}>📋 {s.notes}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <StatusPill label={s.status} tone={statusTone(s.status)} />
          <View style={styles.actionRow}>
            <Pressable onPress={() => openEdit(s)} style={styles.iconBtn}><Ionicons name="pencil-outline" size={16} color={theme.colors.accent} /></Pressable>
            <Pressable onPress={() => deleteShift(s.id)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={theme.colors.danger} /></Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  const renderOpenShift = ({ item: s }: any) => (
    <View style={styles.shiftCard}>
      <View style={[styles.shiftAccent, { backgroundColor: s.urgent ? "#F59E0B" : "#8B5CF6" }]} />
      <View style={styles.shiftCardInner}>
        <View style={styles.shiftInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.shiftSite}>{s.site?.name ?? "—"}</Text>
            {s.urgent && <View style={styles.urgentBadge}><Text style={styles.urgentText}>URGENT</Text></View>}
          </View>
          <Text style={styles.shiftTime}>{formatDate(s.start)} · {formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
          <Text style={styles.shiftMeta}>{s.role} · {formatCurrency(s.pay_rate)}/h · {s.claimed_count ?? 0}/{s.spots_available} claimed</Text>
        </View>
        <Pressable onPress={() => deleteShift(s.id, true)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={theme.colors.danger} /></Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {pendingSwaps > 0 && (
            <Pressable onPress={() => router.push("/admin-shift-swaps" as any)} style={styles.swapBtn}>
              <Ionicons name="swap-horizontal" size={16} color="#F59E0B" />
              <Text style={styles.swapBtnText}>{pendingSwaps} swap{pendingSwaps > 1 ? "s" : ""}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push("/admin-shift-swaps" as any)} style={styles.swapBtnSecondary}>
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color={theme.colors.accent} />
            <Text style={styles.addBtnText}>New</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        {([["assigned", "Assigned"], ["open", "Marketplace"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tabItem, tab === key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
            <View style={styles.countBubble}><Text style={styles.countBubbleText}>{key === "assigned" ? shifts.length : openShifts.length}</Text></View>
          </Pressable>
        ))}
      </View>

      {tab === "assigned" && (
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter by guard name…"
            placeholderTextColor={theme.colors.textTertiary}
            value={guardFilter}
            onChangeText={setGuardFilter}
            autoCorrect={false}
          />
          {guardFilter.length > 0 && (
            <Pressable onPress={() => setGuardFilter("")}><Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} /></Pressable>
          )}
        </View>
      )}

      {loading
        ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
        : <FlatList
            data={tab === "assigned" ? filteredShifts : openShifts}
            keyExtractor={s => s.id}
            renderItem={tab === "assigned" ? renderShift : renderOpenShift}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No {tab === "assigned" ? "shifts" : "open shifts"} found.</Text>}
          />
      }

      {/* Create Shift Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setShowCreate(false); setConflictMsg(null); }} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>New Shift</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.tabBar}>
                {([["assigned", "Assign to Guard"], ["open", "Open Marketplace"]] as const).map(([key, label]) => (
                  <Pressable key={key} onPress={() => setCreateType(key)} style={[styles.tabItem, createType === key && styles.tabItemActive]}>
                    <Text style={[styles.tabLabel, createType === key && styles.tabLabelActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {createType === "assigned" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Guard *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {guards.filter(g => g.role === "employee").map(g => (
                        <Pressable key={g.id} onPress={() => setForm(f => ({ ...f, user_id: g.id }))} style={[styles.optionPill, form.user_id === g.id && styles.optionPillActive]}>
                          <Text style={[styles.optionPillText, form.user_id === g.id && { color: theme.colors.accent }]}>{g.full_name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Site *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {sites.map(s => (
                      <Pressable key={s.id} onPress={() => setForm(f => ({ ...f, site_id: s.id }))} style={[styles.optionPill, form.site_id === s.id && styles.optionPillActive]}>
                        <Text style={[styles.optionPillText, form.site_id === s.id && { color: theme.colors.accent }]}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.optionRow}>
                  {ROLES.map(r => (
                    <Pressable key={r} onPress={() => setForm(f => ({ ...f, role: r }))} style={[styles.optionPill, form.role === r && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, form.role === r && { color: theme.colors.accent }]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Start *</Text>
                <View style={styles.datetimeRow}>
                  <TextInput style={[styles.fieldInput, styles.dateInput]} value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                  <TextInput style={[styles.fieldInput, styles.timeInput]} value={form.startTime} onChangeText={v => setForm(f => ({ ...f, startTime: v }))} placeholder="HH:MM" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>End *</Text>
                <View style={styles.datetimeRow}>
                  <TextInput style={[styles.fieldInput, styles.dateInput]} value={form.endDate} onChangeText={v => setForm(f => ({ ...f, endDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                  <TextInput style={[styles.fieldInput, styles.timeInput]} value={form.endTime} onChangeText={v => setForm(f => ({ ...f, endTime: v }))} placeholder="HH:MM" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pay Rate ($/hr)</Text>
                <TextInput style={styles.fieldInput} value={form.pay_rate} onChangeText={v => setForm(f => ({ ...f, pay_rate: v }))} keyboardType="decimal-pad" placeholderTextColor={theme.colors.textTertiary} />
              </View>

              {createType === "open" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Spots Available</Text>
                  <TextInput style={styles.fieldInput} value={form.spots_available} onChangeText={v => setForm(f => ({ ...f, spots_available: v }))} keyboardType="number-pad" placeholderTextColor={theme.colors.textTertiary} />
                </View>
              )}

              {createType === "assigned" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Manager Notes</Text>
                  <TextInput style={[styles.fieldInput, styles.notesInput]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes for the guard…" placeholderTextColor={theme.colors.textTertiary} multiline />
                </View>
              )}

              {createType === "open" && (
                <Pressable onPress={() => setForm(f => ({ ...f, urgent: !f.urgent }))} style={[styles.optionPill, form.urgent && styles.optionPillActive, { alignSelf: "flex-start", marginBottom: 16 }]}>
                  <Text style={[styles.optionPillText, form.urgent && { color: theme.colors.danger }]}>⚡ Mark as Urgent</Text>
                </Pressable>
              )}

              {conflictMsg && (
                <View style={styles.conflictBanner}>
                  <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                  <Text style={styles.conflictText}>{conflictMsg}</Text>
                </View>
              )}

              <Button label={saving ? "Creating…" : "Create Shift"} onPress={createShift} disabled={saving} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit Shift Modal */}
      <Modal visible={!!editShift} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditShift(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditShift(null)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>Edit Shift</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Start</Text>
                <View style={styles.datetimeRow}>
                  <TextInput style={[styles.fieldInput, styles.dateInput]} value={editForm.startDate ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                  <TextInput style={[styles.fieldInput, styles.timeInput]} value={editForm.startTime ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, startTime: v }))} placeholder="HH:MM" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>End</Text>
                <View style={styles.datetimeRow}>
                  <TextInput style={[styles.fieldInput, styles.dateInput]} value={editForm.endDate ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, endDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                  <TextInput style={[styles.fieldInput, styles.timeInput]} value={editForm.endTime ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, endTime: v }))} placeholder="HH:MM" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pay Rate ($/hr)</Text>
                <TextInput style={styles.fieldInput} value={editForm.pay_rate ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, pay_rate: v }))} keyboardType="decimal-pad" autoCapitalize="none" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.optionRow}>
                  {ROLES.map(r => (
                    <Pressable key={r} onPress={() => setEditForm((f: any) => ({ ...f, role: r }))} style={[styles.optionPill, editForm.role === r && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, editForm.role === r && { color: theme.colors.accent }]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.optionRow}>
                  {["scheduled", "completed", "cancelled"].map(s => (
                    <Pressable key={s} onPress={() => setEditForm((f: any) => ({ ...f, status: s }))} style={[styles.optionPill, editForm.status === s && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, editForm.status === s && { color: theme.colors.accent }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Manager Notes</Text>
                <TextInput style={[styles.fieldInput, styles.notesInput]} value={editForm.notes ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, notes: v }))} placeholder="Optional notes for the guard…" placeholderTextColor={theme.colors.textTertiary} multiline />
              </View>
              <Button label={saving ? "Saving…" : "Save Changes"} onPress={saveEdit} disabled={saving} style={{ marginTop: 8 }} />
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
  swapBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  swapBtnText: { color: "#F59E0B", fontSize: 13, fontWeight: "600" },
  swapBtnSecondary: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 4, gap: 4 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: theme.radius.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  tabItemActive: { backgroundColor: theme.colors.cardElevated },
  tabLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  tabLabelActive: { color: theme.colors.text, fontWeight: "600" },
  countBubble: { backgroundColor: theme.colors.cardElevated, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  countBubbleText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: "600" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 10, backgroundColor: theme.colors.card, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  shiftCard: { flexDirection: "row", backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, overflow: "hidden" },
  shiftAccent: { width: 3, alignSelf: "stretch" },
  shiftCardInner: { flex: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  shiftInfo: { flex: 1 },
  shiftSite: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  shiftTime: { color: theme.colors.accent, fontSize: 13, marginTop: 3 },
  shiftMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  shiftNotes: { color: theme.colors.textTertiary, fontSize: 12, marginTop: 4, fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  iconBtn: { padding: 6, backgroundColor: theme.colors.cardElevated, borderRadius: 8 },
  urgentBadge: { backgroundColor: "rgba(255,69,58,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  urgentText: { color: theme.colors.danger, fontSize: 10, fontWeight: "700" },
  emptyText: { textAlign: "center", color: theme.colors.textTertiary, marginTop: 40, fontSize: 15 },
  modalSafe: { flex: 1, backgroundColor: theme.colors.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  closeBtn: { width: 60 },
  modalTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  modalContent: { padding: 20, paddingBottom: 60 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldInput: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  notesInput: { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
  datetimeRow: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionPillActive: { borderColor: theme.colors.accent },
  optionPillText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  conflictBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: theme.radius.md, padding: 12, marginBottom: 16 },
  conflictText: { color: "#F59E0B", fontSize: 13, flex: 1, lineHeight: 18 },
});
