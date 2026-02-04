'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setLoading(false);

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    }

    fetchNotifications();
  }, [supabase]);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Az önce';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👥';
      case 'mention':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getNotificationText = (notification: Notification) => {
    const data = notification.data as Record<string, string>;
    switch (notification.type) {
      case 'like':
        return `${data.user_name || 'Birisi'} gönderini beğendi`;
      case 'comment':
        return `${data.user_name || 'Birisi'} gönderine yorum yaptı`;
      case 'follow':
        return `${data.user_name || 'Birisi'} seni takip etmeye başladı`;
      case 'mention':
        return `${data.user_name || 'Birisi'} senden bahsetti`;
      default:
        return 'Yeni bildirim';
    }
  };

  const getNotificationUrl = (notification: Notification): string | null => {
    const data = notification.data as Record<string, string>;
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'mention':
        return data.post_id ? `/gonderi/${data.post_id}` : null;
      case 'follow':
        return data.user_username ? `/profil/${data.user_username}` : null;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const url = getNotificationUrl(notification);
    if (url) {
      router.push(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔔 Bildirimler</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Henüz bildirim yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => {
              const url = getNotificationUrl(notification);
              const data = notification.data as Record<string, string>;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex items-start space-x-3 transition-colors ${
                    !notification.read ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                  } ${url ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
                >
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200">
                      {getNotificationText(notification)}
                    </p>
                    {notification.type === 'comment' && data.comment_preview && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        "{data.comment_preview}"
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                  {url && (
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
