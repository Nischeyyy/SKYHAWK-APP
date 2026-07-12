import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Modal, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";
import { api } from "@/src/api/client";
import { StatusPill, Button } from "@/src/ui";
import { relativeTime } from "@/src/utils/format";

type OpsTab = "announcements" | "incidents" | "sites" | "sos" | "swaps" | "live";

const SEVERITY_OPTS = ["info", "warning", "critical"];
const INCIDENT_STATUSES = ["under_review", "escalated", "resolved"];

export default function OpsScreen() {
  const [tab, setTab] = useState<OpsTab>("announcements");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Announcement modal
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", body: "", severity: "info", posted_by: "" });

  // Incident review modal
  const [reviewInc, setReviewInc] = useState<any>(null);
  const [incStatus, setIncStatus] = useState("under_review");
  const [incNotes, setIncNotes] = useState("");

  // Site modal
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editSite, setEditSite] = useState<any>(null);
  const [siteForm, setSiteForm] = useState({ name: "", address: "", latitude: "", longitude: "", supervisor: "", supervisor_phone: "", instructions: "", geofence_radius_m: "150" });

  const [saving, setSaving] = useState(false);

  // New feature state
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [liveGuards, setLiveGuards] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [av, iv, sv, sosv, livev, swapv] = await Promise.all([
        api("/admin/announcements"),
        api("/admin/incidents"),
        api("/admin/sites"),
        api("/sos/active").catch(() => ({ alerts: [] })),
        api("/ops/live-locations").catch(() => ({ guards: [] })),
        api("/admin/shift-swaps?status=accepted").catch(() => ({ swaps: [] })),
      ]);
      setAnnouncements(av.announcements ?? []);
      setIncidents(iv.incidents ?? []);
      setSites(sv.sites ?? []);
      setSosAlerts((sosv as any).alerts ?? []);
      setLiveGuards((livev as any).guards ?? []);
      setSwaps((swapv as any).swaps ?? []);
    } catch {}
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Announcements
  const postAnnouncement = async () => {
    if (!annForm.title || !annForm.body) { Alert.alert("Required", "Title and body are required."); return; }
    setSaving(true);
    try {
      await api("/admin/announcements", { method: "POST", body: annForm });
      await load();
      setShowAnnForm(false);
      setAnnForm({ title: "", body: "", severity: "info", posted_by: "" });
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  const deleteAnn = (id: string) => {
    Alert.alert("Delete", "Remove this announcement?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api(`/admin/announcements/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("Error", e.message); }
      }},
    ]);
  };

  // Incidents
  const submitReview = async () => {
    if (!reviewInc) return;
    setSaving(true);
    try {
      await api(`/incidents/${reviewInc.id}/status`, { method: "PATCH", body: { status: incStatus, note: incNotes } });
      await load();
      setReviewInc(null);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };

  // Sites
  const openAddSite = () => {
    setEditSite(null);
    setSiteForm({ name: "", address: "", latitude: "", longitude: "", supervisor: "", supervisor_phone: "", instructions: "", geofence_radius_m: "150" });
    setShowSiteForm(true);
  };
  const openEditSite = (s: any) => {
    setEditSite(s);
    setSiteForm({ name: s.name, address: s.address, latitude: String(s.latitude), longitude: String(s.longitude), supervisor: s.supervisor, supervisor_phone: s.supervisor_phone, instructions: s.instructions ?? "", geofence_radius_m: String(s.geofence_radius_m) });
    setShowSiteForm(true);
  };
  const saveSite = async () => {
    if (!siteForm.name || !siteForm.address || !siteForm.latitude || !siteForm.longitude) { Alert.alert("Required", "Name, address, latitude and longitude are required."); return; }
    setSaving(true);
    try {
      const body = { ...siteForm, latitude: parseFloat(siteForm.latitude), longitude: parseFloat(siteForm.longitude), geofence_radius_m: parseInt(siteForm.geofence_radius_m) };
      if (editSite) {
        await api(`/admin/sites/${editSite.id}`, { method: "PUT", body });
      } else {
        await api("/admin/sites", { method: "POST", body });
      }
      await load();
      setShowSiteForm(false);
    } catch (e: any) { Alert.alert("Error", e.message); }
    setSaving(false);
  };
  const deleteSite = (id: string) => {
    Alert.alert("Delete Site", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api(`/admin/sites/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { Alert.alert("Error", e.message); }
      }},
    ]);
  };

  const severityTone = (s: string) => s === "critical" ? "danger" : s === "warning" ? "warning" : "accent";
  const incidentTone = (s: string) => s === "resolved" ? "verified" : s === "submitted" ? "warning" : s === "dismissed" ? "neutral" : "accent";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Operations</Text>
        <Pressable onPress={() => { if (tab === "announcements") setShowAnnForm(true); else if (tab === "sites") openAddSite(); }} style={styles.addBtn}>
          {tab !== "incidents" && <><Ionicons name="add" size={20} color={theme.colors.accent} /><Text style={styles.addBtnText}>New</Text></>}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabBar}>
        {([
          ["announcements", "Announce"],
          ["incidents", "Incidents"],
          ["sites", "Sites"],
          ["sos", `SOS${sosAlerts.filter(a => a.status === "active").length ? ` (${sosAlerts.filter(a => a.status === "active").length})` : ""}`],
          ["swaps", `Swaps${swaps.length ? ` (${swaps.length})` : ""}`],
          ["live", `Live (${liveGuards.length})`],
        ] as [OpsTab, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tabItem, tab === key && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading
        ? <ActivityIndicator color={theme.colors.textSecondary} style={{ marginTop: 40 }} />
        : <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textSecondary} />}>
            {/* ANNOUNCEMENTS */}
            {tab === "announcements" && (announcements.length === 0
              ? <Text style={styles.emptyText}>No announcements.</Text>
              : announcements.map(a => (
                <View key={a.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <StatusPill label={a.severity} tone={severityTone(a.severity)} />
                        <Text style={styles.cardMeta}>{relativeTime(a.posted_at)} · by {a.posted_by}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{a.title}</Text>
                      <Text style={styles.cardBody} numberOfLines={2}>{a.body}</Text>
                      <Text style={styles.readCount}>{a.read_count ?? 0} / {a.total_guards ?? 0} guards read</Text>
                    </View>
                    <Pressable onPress={() => deleteAnn(a.id)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={theme.colors.danger} /></Pressable>
                  </View>
                </View>
              ))
            )}

            {/* INCIDENTS */}
            {tab === "incidents" && (incidents.length === 0
              ? <Text style={styles.emptyText}>No incidents reported.</Text>
              : incidents.map(inc => (
                <Pressable key={inc.id} style={styles.card} onPress={() => { setReviewInc(inc); setIncStatus(inc.status === "submitted" ? "under_review" : inc.status); setIncNotes(inc.review_notes ?? ""); }}>
                  <View style={styles.cardRow}>
                    <View style={[styles.incDot, { backgroundColor: inc.severity === "critical" ? theme.colors.danger : inc.severity === "high" ? theme.colors.warning : theme.colors.accent }]} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{inc.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
                      <Text style={styles.cardMeta}>{inc.user_name} · {inc.site?.name ?? "Unknown site"}</Text>
                      <Text style={styles.cardMeta}>{relativeTime(inc.created_at)}</Text>
                      <Text style={styles.cardBody} numberOfLines={2}>{inc.description}</Text>
                    </View>
                    <StatusPill label={inc.status} tone={incidentTone(inc.status)} />
                  </View>
                </Pressable>
              ))
            )}

            {/* SOS */}
            {tab === "sos" && (sosAlerts.length === 0
              ? <Text style={styles.emptyText}>No active SOS alerts.</Text>
              : sosAlerts.map(a => (
                <View key={a.id} style={[styles.card, a.status === "active" && styles.sosCard]}>
                  <View style={styles.cardRow}>
                    <Ionicons name="warning" size={22} color={a.status === "active" ? theme.colors.danger : theme.colors.warning} style={{ marginTop: 2 }} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{a.user_name} — {a.employee_number}</Text>
                      <Text style={styles.cardMeta}>{a.message || "No message"}</Text>
                      <Text style={styles.cardMeta}>{a.latitude?.toFixed(5)}, {a.longitude?.toFixed(5)}</Text>
                      <Text style={styles.cardMeta}>{relativeTime(a.created_at)} · {a.status.toUpperCase()}</Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      {a.status === "active" && (
                        <Pressable onPress={async () => { try { await api(`/sos/${a.id}/acknowledge`, { method: "POST" }); await load(); } catch (e: any) { Alert.alert("Error", e.message); } }} style={styles.iconBtn}>
                          <Ionicons name="checkmark" size={16} color={theme.colors.verified} />
                        </Pressable>
                      )}
                      {a.status !== "resolved" && (
                        <Pressable onPress={async () => { try { await api(`/sos/${a.id}/resolve`, { method: "POST" }); await load(); } catch (e: any) { Alert.alert("Error", e.message); } }} style={styles.iconBtn}>
                          <Ionicons name="checkmark-done" size={16} color={theme.colors.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* SWAPS */}
            {tab === "swaps" && (swaps.length === 0
              ? <Text style={styles.emptyText}>No swap requests pending approval.</Text>
              : swaps.map(sw => (
                <View key={sw.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{sw.requester_name} → {sw.volunteer_name}</Text>
                      <Text style={styles.cardMeta}>{sw.site_name ?? "Unknown site"}</Text>
                      <Text style={styles.cardMeta}>{sw.start ? sw.start.slice(0, 16).replace("T", " ") : ""} – {sw.end ? sw.end.slice(11, 16) : ""}</Text>
                      {sw.reason && <Text style={styles.cardMeta}>Reason: {sw.reason}</Text>}
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable onPress={async () => { try { await api(`/admin/shift-swaps/${sw.id}/decision`, { method: "POST", body: { action: "approve" } }); await load(); } catch (e: any) { Alert.alert("Error", e.message); } }} style={styles.iconBtn}>
                        <Ionicons name="checkmark" size={16} color={theme.colors.verified} />
                      </Pressable>
                      <Pressable onPress={async () => { try { await api(`/admin/shift-swaps/${sw.id}/decision`, { method: "POST", body: { action: "reject" } }); await load(); } catch (e: any) { Alert.alert("Error", e.message); } }} style={styles.iconBtn}>
                        <Ionicons name="close" size={16} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* LIVE LOCATIONS */}
            {tab === "live" && (liveGuards.length === 0
              ? <Text style={styles.emptyText}>No guards currently clocked in.</Text>
              : liveGuards.map((g, i) => (
                <View key={g.user_id + i} style={[styles.card, g.stale && styles.staleCard]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.pingDot, { backgroundColor: g.stale ? theme.colors.warning : theme.colors.verified }]} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{g.full_name}{g.employee_number ? ` · ${g.employee_number}` : ""}</Text>
                      <Text style={styles.cardMeta}>{g.site?.name ?? "No site assigned"}</Text>
                      {g.last_lat != null
                        ? <Text style={styles.cardMeta}>{(g.last_lat as number).toFixed(5)}, {(g.last_lng as number).toFixed(5)}</Text>
                        : <Text style={styles.cardMeta}>No GPS yet</Text>}
                      <Text style={styles.cardMeta}>In since {g.clock_in ? g.clock_in.slice(0, 16).replace("T", " ") : "—"}{g.stale ? " · GPS stale >15 min" : ""}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* SITES */}
            {tab === "sites" && (sites.length === 0
              ? <Text style={styles.emptyText}>No sites configured.</Text>
              : sites.map(s => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{s.name}</Text>
                      <Text style={styles.cardMeta}>{s.address}</Text>
                      <Text style={styles.cardMeta}>Supervisor: {s.supervisor} · {s.supervisor_phone}</Text>
                      <Text style={styles.cardMeta}>Geofence: {s.geofence_radius_m}m radius</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <Pressable onPress={() => openEditSite(s)} style={styles.iconBtn}><Ionicons name="pencil-outline" size={16} color={theme.colors.accent} /></Pressable>
                      <Pressable onPress={() => deleteSite(s.id)} style={styles.iconBtn}><Ionicons name="trash-outline" size={16} color={theme.colors.danger} /></Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
      }

      {/* Announcement Form Modal */}
      <Modal visible={showAnnForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAnnForm(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAnnForm(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[["Title *", "title"], ["Posted By", "posted_by"]].map(([label, key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={(annForm as any)[key]} onChangeText={v => setAnnForm(f => ({ ...f, [key]: v }))} placeholderTextColor={theme.colors.textTertiary} />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Message *</Text>
                <TextInput style={[styles.fieldInput, { minHeight: 100, textAlignVertical: "top" }]} value={annForm.body} onChangeText={v => setAnnForm(f => ({ ...f, body: v }))} multiline placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Severity</Text>
                <View style={styles.optionRow}>
                  {SEVERITY_OPTS.map(s => (
                    <Pressable key={s} onPress={() => setAnnForm(f => ({ ...f, severity: s }))} style={[styles.optionPill, annForm.severity === s && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, annForm.severity === s && { color: theme.colors.accent }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button label={saving ? "Posting…" : "Post to All Guards"} onPress={postAnnouncement} disabled={saving} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Incident Review Modal */}
      <Modal visible={!!reviewInc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewInc(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setReviewInc(null)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>Review Incident</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.incidentDetailCard}>
                <Text style={styles.incidentType}>{reviewInc?.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text>
                <Text style={styles.incidentMeta}>{reviewInc?.user_name} · {reviewInc?.site?.name ?? "Unknown site"}</Text>
                <Text style={styles.incidentMeta}>{reviewInc?.created_at ? relativeTime(reviewInc.created_at) : ""}</Text>
                <Text style={styles.incidentDesc}>{reviewInc?.description}</Text>
                {reviewInc?.witness_name && <Text style={styles.incidentMeta}>Witness: {reviewInc.witness_name} ({reviewInc.witness_contact})</Text>}
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Update Status</Text>
                <View style={styles.optionRow}>
                  {INCIDENT_STATUSES.map(s => (
                    <Pressable key={s} onPress={() => setIncStatus(s)} style={[styles.optionPill, incStatus === s && styles.optionPillActive]}>
                      <Text style={[styles.optionPillText, incStatus === s && { color: theme.colors.accent }]}>{s.replace("_", " ")}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Review Notes</Text>
                <TextInput style={[styles.fieldInput, { minHeight: 80, textAlignVertical: "top" }]} value={incNotes} onChangeText={setIncNotes} multiline placeholder="Add internal notes…" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <Button label={saving ? "Saving…" : "Save Review"} onPress={submitReview} disabled={saving} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Site Form Modal */}
      <Modal visible={showSiteForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSiteForm(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowSiteForm(false)} style={styles.closeBtn}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
            <Text style={styles.modalTitle}>{editSite ? "Edit Site" : "New Site"}</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[
                ["Site Name *", "name", "default"],
                ["Address *", "address", "default"],
                ["Latitude *", "latitude", "decimal-pad"],
                ["Longitude *", "longitude", "decimal-pad"],
                ["Supervisor Name *", "supervisor", "words"],
                ["Supervisor Phone *", "supervisor_phone", "phone-pad"],
                ["Geofence Radius (metres)", "geofence_radius_m", "number-pad"],
              ].map(([label, key, kb]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput style={styles.fieldInput} value={(siteForm as any)[key]} onChangeText={v => setSiteForm(f => ({ ...f, [key]: v }))} keyboardType={kb as any} autoCapitalize={kb === "default" || kb === "words" ? "sentences" : "none"} placeholderTextColor={theme.colors.textTertiary} />
                </View>
              ))}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Site Instructions</Text>
                <TextInput style={[styles.fieldInput, { minHeight: 80, textAlignVertical: "top" }]} value={siteForm.instructions} onChangeText={v => setSiteForm(f => ({ ...f, instructions: v }))} multiline placeholder="Guard instructions…" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <Button label={saving ? "Saving…" : editSite ? "Save Changes" : "Create Site"} onPress={saveSite} disabled={saving} />
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
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(10,132,255,0.12)", borderRadius: theme.radius.pill, paddingHorizontal: 14, paddingVertical: 8, minWidth: 70, minHeight: 36 },
  addBtnText: { color: theme.colors.accent, fontSize: 14, fontWeight: "600" },
  tabScroll: { maxHeight: 50, marginBottom: 12 },
  tabBar: { flexDirection: "row", paddingHorizontal: 20, backgroundColor: "transparent", gap: 6 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.md, alignItems: "center", backgroundColor: theme.colors.card },
  tabItemActive: { backgroundColor: theme.colors.cardElevated },
  tabLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" as const },
  tabLabelActive: { color: theme.colors.text, fontWeight: "600" as const },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "600", marginBottom: 3 },
  cardBody: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  readCount: { color: theme.colors.textTertiary, fontSize: 11, marginTop: 6 },
  incDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  iconBtn: { padding: 6, backgroundColor: theme.colors.cardElevated, borderRadius: 8 },
  emptyText: { textAlign: "center", color: theme.colors.textTertiary, marginTop: 40, fontSize: 15 },
  // Incident detail
  incidentDetailCard: { backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.lg, padding: 16, marginBottom: 20 },
  incidentType: { color: theme.colors.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  incidentMeta: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 2 },
  incidentDesc: { color: theme.colors.text, fontSize: 14, marginTop: 10, lineHeight: 20 },
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
  optionPillText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" as const },
  sosCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  staleCard: { borderColor: theme.colors.warning, borderWidth: 1, opacity: 0.85 },
  pingDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
});
