'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationsSafe } from '@/lib/contexts/NotificationContext';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const notificationContext = useNotificationsSafe();
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notifications = notificationContext?.notifications ?? [];
  const markAsRead = notificationContext?.markAsRead;
  const markAllAsRead = notificationContext?.markAllAsRead;
  const deleteNotification = notificationContext?.deleteNotification;
  const refreshNotifications = notificationContext?.refreshNotifications;
  const getNotificationUrl = notificationContext?.getNotificationUrl;
  const unreadCount = notificationContext?.unreadCount ?? 0;

  useEffect(() => {
    if (refreshNotifications) {
      refreshNotifications().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshNotifications]);

  // Sayfa açıldığında tüm bildirimleri okundu yap
  useEffect(() => {
    if (!loading && unreadCount > 0 && markAllAsRead) {
      markAllAsRead();
    }
  }, [loading, unreadCount, markAllAsRead]);

  // Context yoksa loading göster
  if (!notificationContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

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

  const handleNotificationClick = async (notification: Notification) => {
    // Okunmamışsa okundu yap
    if (!notification.read && markAsRead) {
      await markAsRead(notification.id);
    }

    const url = getNotificationUrl?.(notification);
    if (url) {
      router.push(url);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setNotificationToDelete(notificationId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete || !deleteNotification) return;
    setDeleting(true);
    await deleteNotification(notificationToDelete);
    setDeleting(false);
    setDeleteModalOpen(false);
    setNotificationToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
        {notifications.length > 0 && markAllAsRead && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-emerald-600"
          >
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-500">Henüz bildirim yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification, index) => {
              const url = getNotificationUrl?.(notification);
              const data = notification.data as Record<string, string>;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex items-start gap-3 transition-all group animate-slideUp ${
                    !notification.read ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                  } ${url ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>

                  {/* Content */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteClick(e, notification.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Bildirimi sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Arrow */}
                    {url && (
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setNotificationToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Bildirimi Sil"
        message="Bu bildirimi silmek istediğinize emin misiniz?"
        confirmText="Sil"
        loading={deleting}
      />
    </div>
  );
}
