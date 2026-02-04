'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    // Check current permission state
    const currentPermission = Notification.permission;
    setPermissionState(currentPermission);

    // Don't show if already granted or denied
    if (currentPermission !== 'default') {
      return;
    }

    // Check if we already asked
    const alreadyAsked = localStorage.getItem('notification-permission-asked');
    if (alreadyAsked) {
      return;
    }

    // Show prompt after a short delay (2 seconds) to not be too intrusive
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      localStorage.setItem('notification-permission-asked', 'true');
      setShowPrompt(false);

      if (permission === 'granted') {
        // Register service worker for push notifications
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          console.log('Service Worker ready for push notifications:', registration);
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setShowPrompt(false);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem('notification-permission-asked', 'true');
    setShowPrompt(false);
  }, []);

  // Don't render anything if not showing prompt
  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Bildirimleri Aç
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            Beğeniler, yorumlar ve yeni takipçiler hakkında anında bildirim almak ister misiniz?
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={requestPermission}
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Bildirimleri Aç
          </Button>
          <button
            onClick={dismissPrompt}
            className="w-full py-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-colors"
          >
            Şimdi Değil
          </button>
        </div>

        <p className="mt-4 text-xs text-center text-gray-400">
          İstediğiniz zaman ayarlardan kapatabilirsiniz
        </p>
      </div>
    </div>
  );
}
