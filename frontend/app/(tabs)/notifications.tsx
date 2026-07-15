import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  AppNotification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/src/api/notifications';
import { useNotifications } from '@/src/context/NotificationsContext';

// ── Light palette (matches the rest of the app) ───────────────────────────────
const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  cardUnread: '#F0F8FF',
  border: '#E5E5EA',
  divider: '#E5E5EA',
  text: '#0B0B0C',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',
  accent: '#0A84FF',
};

// ── Category styling ──────────────────────────────────────────────────────────
const CATEGORY: Record<string, { icon: string; color: string; label: string }> = {
  sos:          { icon: 'warning',         color: '#EF4444', label: 'SOS' },
  shift:        { icon: 'calendar',        color: '#3B82F6', label: 'Shift' },
  payroll:      { icon: 'cash-outline',    color: '#10B981', label: 'Payroll' },
  announcement: { icon: 'megaphone',       color: '#F59E0B', label: 'Announcement' },
  swap:         { icon: 'repeat',          color: '#8B5CF6', label: 'Swap' },
  incident:     { icon: 'alert-circle',    color: '#F97316', label: 'Incident' },
  general:      { icon: 'notifications',   color: C.textSecondary, label: 'General' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

// ── Notification card ─────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onRead,
}: {
  item: AppNotification;
  onRead: (id: string) => void;
}) {
  const cfg = CATEGORY[item.category] ?? CATEGORY.general;
  return (
    <Pressable
      style={[s.card, !item.read && s.cardUnread]}
      onPress={() => { if (!item.read) onRead(item.id); }}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
    >
      {/* Category icon */}
      <View style={[s.iconWrap, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.cardTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.cardText} numberOfLines={3}>{item.body}</Text>
        <View style={[s.chip, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[s.chipText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Unread indicator */}
      {!item.read && <View style={s.unreadDot} />}
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const [items, setItems]         = useState<AppNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { refresh: refreshBadge } = useNotifications();

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await fetchNotifications();
      setItems(data);
    } catch { /* non-fatal */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload every time the tab comes into focus
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markNotificationRead(id);
    refreshBadge();
  }, [refreshBadge]);

  const markAll = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead();
    refreshBadge();
  }, [refreshBadge]);

  const unread = items.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Notifications</Text>
          {unread > 0 && (
            <Text style={s.sub}>{unread} unread</Text>
          )}
        </View>
        {unread > 0 && (
          <Pressable onPress={markAll} style={s.markAllBtn}>
            <Ionicons name="checkmark-done" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
            <Text style={s.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={n => n.id}
        renderItem={({ item }) => <NotificationCard item={item} onRead={markRead} />}
        contentContainerStyle={items.length === 0 ? s.listEmpty : s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={56} color={C.textTertiary} />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyHint}>
              You'll see shift updates, payroll alerts, and announcements here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  heading:     { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  sub:         { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  markAllBtn:  {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  markAllText: { color: C.accent, fontSize: 13, fontWeight: '600' },

  list:        { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  listEmpty:   { flex: 1 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  cardUnread: { borderColor: C.accent, backgroundColor: C.cardUnread },

  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  cardBody:  { flex: 1, minWidth: 0 },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  cardTime:  { color: C.textTertiary, fontSize: 11, flexShrink: 0, marginTop: 1 },
  cardText:  { color: C.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 8 },

  chip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.accent, marginTop: 6, marginLeft: 8, flexShrink: 0,
  },

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyHint:  { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },
});
