// Agara Köyü - Service Worker for Push Notifications

const CACHE_NAME = 'agara-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(clients.claim());
});

// Push event - when notification is received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Agara Köyü',
    body: 'Yeni bir bildiriminiz var!',
    icon: '/icons/android/android-launchericon-192-192.png',
    badge: '/icons/android/android-launchericon-72-72.png',
    url: '/bildirimler',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/android/android-launchericon-192-192.png',
    badge: data.badge || '/icons/android/android-launchericon-72-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/bildirimler',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Aç',
      },
      {
        action: 'close',
        title: 'Kapat',
      },
    ],
    tag: data.tag || 'agara-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/bildirimler';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions (future use)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
});
