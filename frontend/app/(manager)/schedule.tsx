import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Modal, Pressable, TextInput,
  ScrollView, RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { StatusPill, Button } from "@/src/ui";
import { formatDate, formatShiftTime, formatCurrency } from "@/src/utils/format";

type Tab = "assigned" | "open";
const ROLES = ["Patrol", "Concierge Security", "Event Security", "K9 Support", "Access Control"];

export default function ScheduleScreen() {
  const [tab, setTab] = useState<Tab>("assigned");
  const [shifts, setShifts] = useState<any[]>([]);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create shift modal
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"assigned" | "open">("assigned");
  const [form, setForm] = useState({ user_id: "", site_id: "", start: "", end: "", role: "Patrol", pay_rate: "24.50", spots_available: "1", urgent: false });
  const [saving, setSaving] = useState(false);

  // Edit shift modal
  const [editShift, setEditShift] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const [sv, ov, gv, sitv] = await Promise.all([
        api("/admin/shifts"),
        api("/admin/open-shifts"),
        api("/admin/guards"),
        api("/admin/sites"),
      ]);
      setShifts(sv.shifts ?? []);
      setOpenShifts(ov.shifts ?? []);
      setGuards(gv.guards ?? []);
      setSites(sitv.sites ?? []);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const createShift = async () => {
    if (!form.site_id || !form.start || !form.end) { Alert.alert("Required", "Site, start and end time are required."); return; }
    if (createType === "assigned" && !form.user_id) { Alert.alert("Required", "Please select a guard."); return; }
    setSaving(true);
    try {
      if (createType === "assigned") {
        await api("/admin/shifts", { method: "POST", body: { user_id: form.user_id, site_id: form.site_id, start: form.start, end: form.end, role: form.role, pay_rate: parseFloat(form.pay_rate) } });
      } else {
        await api("/admin/open-shifts", { method: "POST", body: { site_id: form.site_id, start: form.start, end: form.end, role: form.role, pay_rate: parseFloat(form.pay_rate), spots_available: parseInt(form.spots_available), urgent: form.urgent } });
      }
      await load();
      setShowCreate(false);
      setForm({ user_id: "", site_id: "", start: "", end: "", role: "Patrol", pay_rate: "24.50", spots_available: "1", urgent: false });
    } catch (e: any) { Alert.alert("Error", e.message); }
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
    setEditShift(shift);
    setEditForm({ start: shift.start?.slice(0, 16) ?? "", end: shift.end?.slice(0, 16) ?? "", role: shift.role ?? "Patrol", pay_rate: String(shift.pay_rate ?? "24.50"), status: shift.status ?? "scheduled" });
  };

  const saveEdit = async () => {
    if (!editShift) return;
    setSaving(true);
    try {
      await api(`/admin/shifts/${editShift.id}`, { method: "PUT", body: { ...editForm, pay_rate: parseFloat(editForm.pay_rate) } });
      await load();
      setEditShift(null);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const statusTone = (s: string) => s === "completed" ? "verified" : s === "scheduled" ? "accent" : "neutral";

  const renderShift = ({ item: s }: any) => (
    <View style={styles.shiftCard}>
      <View style={styles.shiftCardTop}>
        <View style={styles.shiftInfo}>
          <Text style={styles.shiftSite}>{s.site?.name ?? "—"}</Text>
          <Text style={styles.shiftTime}>{formatDate(s.start)} · {formatShiftTime(s.start)} – {formatShiftTime(s.end)}</Text>
          <Text style={styles.shiftMeta}>{s.role} · {s.user?.full_name ?? "Unassigned"} · {formatCurrency(s.pay_rate)}/h</Text>
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
      <View style={styles.shiftCardTop}>
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
        <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={theme.colors.accent} />
          <Text style={styles.addBtnText}>New</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {([["assigned", "Assigned Shifts"], ["open", "Open Marketplace"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tabItem, tab === key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
        : <FlatList
            data={tab === "assigned" ? shifts : openShifts}
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
            <Pressable onPress={() => setShowCreate(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>New Shift</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
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

              {[
                ["Start (YYYY-MM-DDTHH:MM)", "start"],
                ["End (YYYY-MM-DDTHH:MM)", "end"],
                ["Pay Rate ($/hr)", "pay_rate"],
                ...(createType === "open" ? [["Spots Available", "spots_available"]] : []),
              ].map(([label, key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={(form as any)[key]} onChangeText={v => setForm(f => ({ ...f, [key]: v }))} placeholder={key === "start" || key === "end" ? "2026-07-15T18:00" : ""} placeholderTextColor={theme.colors.textTertiary} keyboardType={key === "pay_rate" || key === "spots_available" ? "decimal-pad" : "default"} autoCapitalize="none" />
                </View>
              ))}

              {createType === "open" && (
                <Pressable onPress={() => setForm(f => ({ ...f, urgent: !f.urgent }))} style={[styles.optionPill, form.urgent && styles.optionPillActive, { alignSelf: "flex-start", marginBottom: 16 }]}>
                  <Text style={[styles.optionPillText, form.urgent && { color: theme.colors.danger }]}>⚡ Mark as Urgent</Text>
                </Pressable>
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
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[
                ["Start (YYYY-MM-DDTHH:MM)", "start"],
                ["End (YYYY-MM-DDTHH:MM)", "end"],
                ["Pay Rate ($/hr)", "pay_rate"],
              ].map(([label, key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={editForm[key] ?? ""} onChangeText={v => setEditForm((f: any) => ({ ...f, [key]: v }))} keyboardType={key === "pay_rate" ? "decimal-pad" : "default"} autoCapitalize="none" placeholderTextColor={theme.colors.textTertiary} />
                </View>
              ))}
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
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 4, gap: 4 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: theme.radius.md, alignItems: "center" },
  tabItemActive: { backgroundColor: theme.colors.cardElevated },
  tabLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  tabLabelActive: { color: theme.colors.text, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  shiftCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  shiftCardTop: { flexDirection: "row", justifyContent: "space-between" },
  shiftInfo: { flex: 1 },
  shiftSite: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  shiftTime: { color: theme.colors.accent, fontSize: 13, marginTop: 3 },
  shiftMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  iconBtn: { padding: 6, backgroundColor: theme.colors.cardElevated, borderRadius: 8 },
  urgentBadge: { backgroundColor: "rgba(255,69,58,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  urgentText: { color: theme.colors.danger, fontSize: 10, fontWeight: "700" },
  emptyText: { textAlign: "center", color: theme.colors.textTertiary, marginTop: 40, fontSize: 15 },
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
