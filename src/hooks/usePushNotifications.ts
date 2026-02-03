'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  getPushPermissionStatus,
  isSubscribed as checkIsSubscribed,
} from '@/lib/push-notifications';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported' | 'loading';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(userId: string | null): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'loading'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (!supported) {
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      // Register service worker
      await registerServiceWorker();

      // Check permission
      const perm = await getPushPermissionStatus();
      setPermission(perm);

      // Check if subscribed
      const subscribed = await checkIsSubscribed();
      setIsSubscribed(subscribed);

      setIsLoading(false);
    }

    init();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('Giriş yapmalısınız');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Bildirim izni verilmedi');
        setIsLoading(false);
        return false;
      }

      // Subscribe
      const subscription = await subscribeToPush(userId);

      if (subscription) {
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      } else {
        setError('Bildirim aboneliği başarısız');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      setError('Bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  }, [userId]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromPush(userId);
      if (success) {
        setIsSubscribed(false);
      }
      setIsLoading(false);
      return success;
    } catch (err) {
      setError('Abonelik iptal edilemedi');
      setIsLoading(false);
      return false;
    }
  }, [userId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
