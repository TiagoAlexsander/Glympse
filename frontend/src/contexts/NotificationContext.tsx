import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, any> | null;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotif: (id: number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      setNotifications(res.data.data.notifications ?? []);
      setUnreadCount(res.data.data.unread_count ?? 0);
    } catch {
      // Silencioso — não quebra a UI
    } finally {
      setLoading(false);
    }
  }, [user?.id, token]);

  // Carrega ao fazer login, e a cada 60s
  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function deleteNotif(id: number) {
    await api.delete(`/notifications/${id}`);
    const notif = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, loadNotifications, markRead, markAllRead, deleteNotif }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  return ctx;
}
