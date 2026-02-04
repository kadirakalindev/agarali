import { createClient } from '@/lib/supabase/client';

// VAPID public key (this is a PUBLIC key, safe to expose)
const VAPID_PUBLIC_KEY = 'BFDN3f02Gkudda8Szoyg1RxH6XexW2VPCkfycxHUSmkFzRUuUTmMfHcYivZckCE7pBtDLVYpKsH7ZrOecjMkZqY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  try {
    // Check if VAPID key is available
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key is not configured');
      throw new Error('Push notifications are not configured');
    }

    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Convert VAPID key and subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Save subscription to Supabase
    const supabase = createClient();
    const subscriptionJSON = subscription.toJSON();

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (!existing) {
      await supabase.from('push_subscriptions').insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh,
        auth: subscriptionJSON.keys?.auth,
        platform: 'web',
      });
    }

    console.log('Push subscription saved:', subscription);
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Remove from Supabase
      const supabase = createClient();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('Unsubscribe failed:', error);
    return false;
  }
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushPermissionStatus(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
