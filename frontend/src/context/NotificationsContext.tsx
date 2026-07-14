import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchUnreadCount } from '@/src/api/notifications';
import { useAuth } from '@/src/auth/AuthContext';

type NotificationsContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  refresh: async () => {},
});

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      // Network errors are non-fatal for the badge count
    }
  }, [user]);

  // Poll while the app is in the foreground
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [user, refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
