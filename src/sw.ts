/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Extend SW registration type for Background Sync
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^https:\/\/.*\.supabase\.co\/storage/,
      handler: "CacheFirst",
      options: {
        cacheName: "supabase-images",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      matcher: /^https:\/\/.*\.supabase\.co\/rest/,
      handler: "NetworkFirst",
      options: { cacheName: "supabase-api", networkTimeoutSeconds: 5 },
    },
  ],
});

serwist.addEventListeners();

// Background Sync — process offline request queue
self.addEventListener("sync", (event) => {
  const syncEvent = event as unknown as { tag: string; waitUntil(p: Promise<unknown>): void };
  if (syncEvent.tag === "offline-requests") {
    syncEvent.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PROCESS_OFFLINE_QUEUE" });
        });
      })
    );
  }
});

// Web Push notifications
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  const data = event.data.json() as { title: string; body: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/icon-72x72.png",
      vibrate: [200, 100, 200],
      tag: "writeoff-notification",
      renotify: true,
      data: { url: data.url ?? "/requests/review" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url: string }).url;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url));
        return existing ? existing.focus() : self.clients.openWindow(url);
      })
  );
});
