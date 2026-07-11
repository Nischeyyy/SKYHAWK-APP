import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Modal, Pressable,
  ScrollView, RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { Avatar, StatusPill, Button } from "@/src/ui";
import { relativeTime } from "@/src/utils/format";

const STATUS_OPTIONS = ["Active - Full Time", "Active - Part Time", "Inactive", "Terminated", "Onboarding"];

export default function GuardsScreen() {
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Detail modal
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Add guard modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", full_name: "", phone: "", employment_status: "Active - Full Time", licence_number: "", certifications: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api("/admin/guards"); setGuards(d.guards ?? []); } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openDetail = async (guard: any) => {
    setSelected(guard); setDetailLoading(true);
    setEditForm({ full_name: guard.full_name, phone: guard.phone ?? "", employee_number: guard.employee_number ?? "", licence_number: guard.licence_number ?? "", licence_expiry: guard.licence_expiry ? guard.licence_expiry.slice(0, 10) : "", employment_status: guard.employment_status ?? "", certifications: (guard.certifications ?? []).join(", ") });
    try { const d = await api(`/admin/guards/${guard.id}`); setDetail(d); } catch {}
    setDetailLoading(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: any = { ...editForm, certifications: editForm.certifications.split(",").map((s: string) => s.trim()).filter(Boolean) };
      await api(`/admin/guards/${selected.id}`, { method: "PUT", body });
      await load();
      setEditing(false);
      Alert.alert("Saved", "Guard profile updated.");
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const addGuard = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) { Alert.alert("Required", "Email, password, and name are required."); return; }
    setSaving(true);
    try {
      const body = { ...addForm, certifications: addForm.certifications.split(",").map((s: string) => s.trim()).filter(Boolean) };
      await api("/admin/guards", { method: "POST", body });
      await load();
      setShowAdd(false);
      setAddForm({ email: "", password: "", full_name: "", phone: "", employment_status: "Active - Full Time", licence_number: "", certifications: "" });
      Alert.alert("Added", "Guard account created.");
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const filtered = guards.filter(g =>
    g.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  const statusTone = (s: string) => {
    if (!s) return "neutral";
    if (s.includes("Active")) return "verified";
    if (s === "Onboarding") return "accent";
    return "neutral";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Guards</Text>
        <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textTertiary} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name, email or ID" placeholderTextColor={theme.colors.textTertiary} />
        {search.length > 0 && <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} /></Pressable>}
      </View>

      {loading
        ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={g => g.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}
            renderItem={({ item: g }) => (
              <Pressable style={styles.guardCard} onPress={() => openDetail(g)}>
                <Avatar name={g.full_name} size={44} />
                <View style={styles.guardInfo}>
                  <Text style={styles.guardName}>{g.full_name}</Text>
                  <Text style={styles.guardMeta}>{g.employee_number ?? "—"} · {g.email}</Text>
                  {g.licence_expiry && (() => {
                    const days = Math.round((new Date(g.licence_expiry).getTime() - Date.now()) / 86400000);
                    if (days < 60) return <Text style={[styles.guardMeta, { color: days < 14 ? theme.colors.danger : theme.colors.warning }]}>⚠ Licence expires in {days}d</Text>;
                    return null;
                  })()}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <StatusPill label={g.employment_status?.split(" - ")[1] ?? g.employment_status ?? "—"} tone={statusTone(g.employment_status)} />
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No guards found.</Text>}
          />
      }

      {/* Guard Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setSelected(null); setDetail(null); setEditing(false); }}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setSelected(null); setDetail(null); setEditing(false); }} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{editing ? "Edit Guard" : "Guard Profile"}</Text>
            {!editing
              ? <Pressable onPress={() => setEditing(true)} style={styles.editBtn}><Text style={styles.editBtnText}>Edit</Text></Pressable>
              : <Pressable onPress={() => setEditing(false)} style={styles.editBtn}><Text style={[styles.editBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text></Pressable>
            }
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {!editing ? (
                <>
                  <View style={styles.profileHeader}>
                    <Avatar name={selected?.full_name} size={64} />
                    <View style={{ marginLeft: 16 }}>
                      <Text style={styles.profileName}>{selected?.full_name}</Text>
                      <Text style={styles.profileMeta}>{selected?.employee_number} · {selected?.role}</Text>
                      <StatusPill label={selected?.employment_status ?? "—"} tone={statusTone(selected?.employment_status)} />
                    </View>
                  </View>
                  <View style={styles.infoSection}>
                    {[
                      ["Email", selected?.email],
                      ["Phone", selected?.phone ?? "—"],
                      ["Licence #", selected?.licence_number ?? "—"],
                      ["Licence Expiry", selected?.licence_expiry ? selected.licence_expiry.slice(0, 10) : "—"],
                      ["Onboarding", selected?.onboarding_complete ? "Complete" : "Incomplete"],
                      ["Certifications", (selected?.certifications ?? []).join(", ") || "None"],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.infoRow}>
                        <Text style={styles.infoKey}>{k}</Text>
                        <Text style={styles.infoVal}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {detailLoading && <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 20 }} />}
                  {detail?.recent_shifts?.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>Recent Shifts</Text>
                      {detail.recent_shifts.slice(0, 5).map((s: any) => (
                        <View key={s.id} style={styles.miniCard}>
                          <Text style={styles.miniCardTitle}>{s.site?.name ?? "—"}</Text>
                          <Text style={styles.miniCardMeta}>{s.start?.slice(0, 10)} · {s.role} · <Text style={{ color: s.status === "completed" ? theme.colors.verified : theme.colors.textSecondary }}>{s.status}</Text></Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {[
                    ["Full Name", "full_name", "text"],
                    ["Phone", "phone", "phone-pad"],
                    ["Employee #", "employee_number", "text"],
                    ["Licence #", "licence_number", "text"],
                    ["Licence Expiry (YYYY-MM-DD)", "licence_expiry", "text"],
                    ["Certifications (comma separated)", "certifications", "text"],
                  ].map(([label, key, kb]) => (
                    <View key={key} style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>{label}</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={editForm[key] ?? ""}
                        onChangeText={v => setEditForm((f: any) => ({ ...f, [key]: v }))}
                        keyboardType={kb as any}
                        placeholderTextColor={theme.colors.textTertiary}
                        autoCapitalize="none"
                      />
                    </View>
                  ))}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Employment Status</Text>
                    <View style={styles.optionRow}>
                      {STATUS_OPTIONS.map(opt => (
                        <Pressable key={opt} onPress={() => setEditForm((f: any) => ({ ...f, employment_status: opt }))} style={[styles.optionPill, editForm.employment_status === opt && styles.optionPillActive]}>
                          <Text style={[styles.optionPillText, editForm.employment_status === opt && { color: theme.colors.accent }]}>{opt.replace("Active - ", "")}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <Button label={saving ? "Saving…" : "Save Changes"} onPress={saveEdit} disabled={saving} style={{ marginTop: 20 }} />
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Guard Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAdd(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>Add Guard</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[
                ["Full Name *", "full_name", "words"],
                ["Email *", "email", "email-address"],
                ["Password *", "password", "text"],
                ["Phone", "phone", "phone-pad"],
                ["Licence #", "licence_number", "text"],
                ["Certifications (comma separated)", "certifications", "text"],
              ].map(([label, key, kb]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={(addForm as any)[key]}
                    onChangeText={v => setAddForm(f => ({ ...f, [key]: v }))}
                    keyboardType={kb as any}
                    secureTextEntry={key === "password"}
                    autoCapitalize={key === "email" ? "none" : "words"}
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Employment Status</Text>
                <View style={styles.optionRow}>
                  {STATUS_OPTIONS.map(opt => (
                    <Pressable key={opt} onPress={() => setAddForm(f => ({ ...f, employment_status: opt }))} style={[styles.optionPill, addForm.employment_status === opt && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, addForm.employment_status === opt && { color: theme.colors.accent }]}>{opt.replace("Active - ", "")}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button label={saving ? "Creating…" : "Create Guard"} onPress={addGuard} disabled={saving} style={{ marginTop: 20 }} />
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  guardCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  guardInfo: { flex: 1 },
  guardName: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  guardMeta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  emptyText: { textAlign: "center", color: theme.colors.textTertiary, marginTop: 40, fontSize: 15 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: theme.colors.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  closeBtn: { width: 60 },
  modalTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  editBtn: { width: 60, alignItems: "flex-end" },
  editBtnText: { color: theme.colors.accent, fontSize: 16, fontWeight: "500" },
  modalContent: { padding: 20, paddingBottom: 60 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  profileName: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  profileMeta: { color: theme.colors.textSecondary, fontSize: 14, marginVertical: 4 },
  infoSection: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, marginBottom: 24 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  infoKey: { color: theme.colors.textSecondary, fontSize: 14 },
  infoVal: { color: theme.colors.text, fontSize: 14, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  sectionLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  miniCard: { backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.md, padding: 12, marginBottom: 6 },
  miniCardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  miniCardMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
  // Form
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldInput: { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.pill, backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionPillActive: { borderColor: theme.colors.accent },
  optionPillText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
});
