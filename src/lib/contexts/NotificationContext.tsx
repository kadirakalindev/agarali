'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastContainer, ToastData } from '@/components/ui/Toast';
import type { Notification } from '@/types';

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Safe hook that doesn't throw if used outside provider
export function useNotificationsSafe() {
  return useContext(NotificationContext);
}

interface NotificationProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  }, [userId, supabase]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId, supabase]);

  // Get notification message based on type
  const getNotificationMessage = (notification: Notification) => {
    const data = notification.data as Record<string, string>;
    switch (notification.type) {
      case 'like':
        return {
          title: 'Yeni Beğeni',
          message: `${data.user_name || 'Birisi'} gönderinizi beğendi`,
          url: data.post_id ? `/gonderi/${data.post_id}` : '/bildirimler',
        };
      case 'comment':
        return {
          title: 'Yeni Yorum',
          message: `${data.user_name || 'Birisi'} gönderinize yorum yaptı`,
          url: data.post_id ? `/gonderi/${data.post_id}` : '/bildirimler',
        };
      case 'follow':
        return {
          title: 'Yeni Takipçi',
          message: `${data.user_name || 'Birisi'} sizi takip etmeye başladı`,
          url: data.user_username ? `/profil/${data.user_username}` : '/bildirimler',
        };
      case 'mention':
        return {
          title: 'Sizden Bahsedildi',
          message: `${data.user_name || 'Birisi'} sizden bahsetti`,
          url: data.post_id ? `/gonderi/${data.post_id}` : '/bildirimler',
        };
      default:
        return {
          title: 'Yeni Bildirim',
          message: 'Yeni bir bildiriminiz var',
          url: '/bildirimler',
        };
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Add to notifications list
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast
          const { title, message, url } = getNotificationMessage(newNotification);
          showToast({
            type: 'notification',
            title,
            message,
            duration: 6000,
            onClick: () => {
              router.push(url);
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, fetchNotifications, showToast, router]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        showToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </NotificationContext.Provider>
  );
}
