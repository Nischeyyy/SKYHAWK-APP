import { api } from './client';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  category: 'sos' | 'shift' | 'payroll' | 'announcement' | 'swap' | 'incident' | 'general';
  link?: string;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(limit = 60): Promise<AppNotification[]> {
  const data = await api<{ notifications: AppNotification[] }>(`/notifications?limit=${limit}`);
  return data.notifications ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await api(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api('/notifications/read-all', { method: 'POST' });
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await api<{ count: number }>('/notifications/unread-count');
  return data.count ?? 0;
}
