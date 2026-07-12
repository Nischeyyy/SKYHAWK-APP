import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { relativeTime } from "@/src/utils/format";
import { success as hapticSuccess } from "@/src/utils/haptics";

// ─── Light palette (matches Profile / Schedule) ─────────────────────────────
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  border: "#E5E5EA",
  divider: "#E5E5EA",
  text: "#0B0B0C",
  textSecondary: "#6C6C70",
  textTertiary: "#AEAEB2",
  accent: "#6C5CE7",
  accentSoft: "rgba(108,92,231,0.10)",
  blue: "#0A84FF",
  green: "#2FAE59",
  amber: "#C77700",
};

const FILTERS: { key: string; label: string; icon: any }[] = [
  { key: "all", label: "All Posts", icon: null },
  { key: "announcement", label: "Announcements", icon: "megaphone-outline" },
  { key: "event", label: "Events", icon: "calendar-outline" },
  { key: "recognition", label: "Recognition", icon: "star-outline" },
];

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  announcement: { label: "Announcement", color: C.blue, bg: "rgba(10,132,255,0.10)", icon: "megaphone" },
  event: { label: "Event", color: C.amber, bg: "rgba(199,119,0,0.10)", icon: "calendar" },
  recognition: { label: "Recognition", color: C.green, bg: "rgba(47,174,89,0.10)", icon: "star" },
};

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AvatarCircle({ name, size = 44 }: { name?: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: C.accent, fontSize: size * 0.36, fontWeight: "700" }}>{initials(name)}</Text>
    </View>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const load = useCallback(async (f: string) => {
    try {
      const q = f === "all" ? "" : `?type=${f}`;
      const d = await api(`/community/posts${q}`);
      setPosts(d.posts || []);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(filter); }, [load, filter]));

  const submitPost = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const created = await api("/community/posts", { method: "POST", body: { body, type: "post" } });
      hapticSuccess();
      setDraft("");
      if (filter === "all") setPosts((prev) => [created, ...prev]);
      else load(filter);
    } catch {}
    setPosting(false);
  };

  const toggleLike = async (id: string) => {
    setPosts((prev) => prev.map((p) => p.id === id
      ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
      : p));
    try {
      await api(`/community/posts/${id}/like`, { method: "POST" });
    } catch {
      load(filter);
    }
  };

  const submitComment = async (id: string) => {
    const body = commentDraft.trim();
    if (!body) return;
    try {
      const updated = await api(`/community/posts/${id}/comments`, { method: "POST", body: { body } });
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setCommentDraft("");
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Community</Text>
              <Text style={styles.subtitle}>Updates & announcements from your team</Text>
            </View>
            <View style={styles.headerIcons}>
              <Pressable hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="search" size={18} color={C.text} />
              </Pressable>
              <Pressable hitSlop={10} style={styles.composeBtn}>
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* Composer */}
            <View style={styles.composer} testID="composer-card">
              <View style={styles.composerTop}>
                <AvatarCircle name={user?.full_name} size={40} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.composerName}>{user?.full_name}</Text>
                  <View style={styles.audienceRow}>
                    <Ionicons name="people-outline" size={13} color={C.textSecondary} />
                    <Text style={styles.audienceText}>All Staff</Text>
                    <Ionicons name="chevron-down" size={12} color={C.textSecondary} />
                  </View>
                </View>
              </View>
              <View style={styles.composerInputRow}>
                <TextInput
                  testID="composer-input"
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Share an update with your team..."
                  placeholderTextColor={C.textTertiary}
                  style={styles.composerInput}
                  multiline
                />
                <Ionicons name="mic-outline" size={18} color={C.textTertiary} />
              </View>
              <View style={styles.composerToolbar}>
                <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                  <Ionicons name="image-outline" size={19} color={C.textSecondary} />
                  <Ionicons name="document-attach-outline" size={19} color={C.textSecondary} />
                  <Ionicons name="location-outline" size={19} color={C.textSecondary} />
                  <Ionicons name="happy-outline" size={19} color={C.textSecondary} />
                  <Ionicons name="pricetag-outline" size={19} color={C.textSecondary} />
                  <Ionicons name="ellipsis-horizontal" size={19} color={C.textSecondary} />
                </View>
                <Pressable
                  testID="post-btn"
                  onPress={submitPost}
                  disabled={!draft.trim() || posting}
                  style={[styles.postBtn, (!draft.trim() || posting) && styles.postBtnDisabled]}
                >
                  {posting
                    ? <ActivityIndicator color={C.accent} size="small" />
                    : <Text style={[styles.postBtnText, (!draft.trim()) && styles.postBtnTextDisabled]}>Post</Text>}
                </Pressable>
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      testID={`filter-${f.key}`}
                      onPress={() => setFilter(f.key)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      {f.icon && <Ionicons name={f.icon} size={13} color={active ? "#FFFFFF" : C.accent} />}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Feed */}
            {loading ? (
              <ActivityIndicator color={C.textSecondary} style={{ marginTop: 30 }} />
            ) : posts.length === 0 ? (
              <Text style={styles.empty}>Nothing here yet</Text>
            ) : (
              posts.map((p) => {
                const meta = TYPE_META[p.type];
                const showComments = openComments === p.id;
                return (
                  <View key={p.id} testID={`post-${p.id}`} style={styles.postCard}>
                    <View style={styles.postHeaderRow}>
                      <AvatarCircle name={p.author_name} size={40} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.postAuthor}>{p.author_name}</Text>
                        <Text style={styles.postMeta}>@{p.author_handle} · {relativeTime(p.created_at)}</Text>
                      </View>
                      <Pressable hitSlop={8}>
                        <Ionicons name="ellipsis-vertical" size={16} color={C.textTertiary} />
                      </Pressable>
                    </View>

                    {meta && (
                      <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={11} color={meta.color} />
                        <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    )}

                    {p.title && <Text style={styles.postTitle}>{p.title}</Text>}
                    <Text style={styles.postBody}>{p.body}</Text>

                    {p.attachments?.map((a: any, i: number) => (
                      <View key={i} style={styles.attachmentCard}>
                        <View style={styles.attachmentIcon}>
                          <Ionicons name="location" size={18} color={C.blue} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.attachmentName} numberOfLines={1}>{a.name}</Text>
                          <Text style={styles.attachmentSub}>{(a.kind || "file").toUpperCase()} · {a.size_label}</Text>
                        </View>
                        <Ionicons name="download-outline" size={18} color={C.textSecondary} />
                      </View>
                    ))}

                    <View style={styles.postFooter}>
                      <Pressable testID={`like-${p.id}`} onPress={() => toggleLike(p.id)} style={styles.footerBtn} hitSlop={6}>
                        <Ionicons name={p.liked_by_me ? "heart" : "heart-outline"} size={17} color={p.liked_by_me ? "#E13B3B" : C.textSecondary} />
                        <Text style={styles.footerCount}>{p.like_count}</Text>
                      </Pressable>
                      <Pressable
                        testID={`comment-toggle-${p.id}`}
                        onPress={() => setOpenComments(showComments ? null : p.id)}
                        style={styles.footerBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color={C.textSecondary} />
                        <Text style={styles.footerCount}>{p.comment_count}</Text>
                      </Pressable>
                      <Text style={styles.seenBy}>Seen by {p.seen_count}</Text>
                    </View>

                    {showComments && (
                      <View style={styles.commentsBlock}>
                        {p.comments.map((c: any) => (
                          <View key={c.id} style={styles.commentRow}>
                            <AvatarCircle name={c.user_name} size={28} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text style={styles.commentAuthor}>{c.user_name}</Text>
                              <Text style={styles.commentBody}>{c.body}</Text>
                            </View>
                          </View>
                        ))}
                        <View style={styles.commentInputRow}>
                          <TextInput
                            testID={`comment-input-${p.id}`}
                            value={commentDraft}
                            onChangeText={setCommentDraft}
                            placeholder="Write a comment..."
                            placeholderTextColor={C.textTertiary}
                            style={styles.commentInput}
                          />
                          <Pressable testID={`comment-send-${p.id}`} onPress={() => submitComment(p.id)} hitSlop={8}>
                            <Ionicons name="send" size={17} color={C.accent} />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 },
  title: { color: C.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: C.textSecondary, fontSize: 13.5, marginTop: 2 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  composeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },

  composer: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  composerTop: { flexDirection: "row", alignItems: "center" },
  composerName: { color: C.text, fontSize: 15, fontWeight: "600" },
  audienceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  audienceText: { color: C.textSecondary, fontSize: 12.5 },
  composerInputRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 14, gap: 8 },
  composerInput: { flex: 1, color: C.text, fontSize: 15, minHeight: 22, maxHeight: 100, paddingTop: 0 },
  composerToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  postBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, minWidth: 66, alignItems: "center" },
  postBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  postBtnDisabled: { backgroundColor: C.accentSoft },
  postBtnTextDisabled: { color: C.accent, opacity: 0.5 },

  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accentSoft, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  chipActive: { backgroundColor: C.accent },
  chipText: { color: C.accent, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#FFFFFF" },

  empty: { color: C.textSecondary, textAlign: "center", marginTop: 40, fontSize: 15 },

  postCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
  postHeaderRow: { flexDirection: "row", alignItems: "center" },
  postAuthor: { color: C.text, fontSize: 15, fontWeight: "600" },
  postMeta: { color: C.textSecondary, fontSize: 12.5, marginTop: 1 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 10 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  postTitle: { color: C.text, fontSize: 16.5, fontWeight: "700", marginTop: 10 },
  postBody: { color: C.text, fontSize: 14.5, lineHeight: 21, marginTop: 6 },

  attachmentCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg, borderRadius: 12, padding: 10, marginTop: 12 },
  attachmentIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(10,132,255,0.10)", alignItems: "center", justifyContent: "center" },
  attachmentName: { color: C.text, fontSize: 13.5, fontWeight: "500" },
  attachmentSub: { color: C.textSecondary, fontSize: 11.5, marginTop: 1 },

  postFooter: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider, gap: 18 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerCount: { color: C.textSecondary, fontSize: 13 },
  seenBy: { color: C.textTertiary, fontSize: 12, marginLeft: "auto" },

  commentsBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  commentRow: { flexDirection: "row", marginBottom: 10 },
  commentAuthor: { color: C.text, fontSize: 13, fontWeight: "600" },
  commentBody: { color: C.text, fontSize: 13, marginTop: 1, lineHeight: 18 },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  commentInput: { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: C.text, fontSize: 13.5 },
});
