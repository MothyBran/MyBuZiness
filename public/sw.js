// public/sw.js

const CACHE_NAME = "buziness-cache-v1";
const OFFLINE_URL = "/offline.html"; // optionaler Fallback (siehe unten)

// Bei der Installation: erste wichtige Assets cachen (optional erweitern)
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([
        "/",               // Startseite
        "/manifest.webmanifest"
        // Optional: "/offline.html", "/favicon.ico", "/apple-touch-icon.png"
      ]);
      self.skipWaiting();
    })()
  );
});

// Alte Caches aufräumen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)));
      self.clients.claim();
    })()
  );
});

// Fetch-Strategie: Netz zuerst, Fallback auf Cache, optional offline.html
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET-Anfragen cachen
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const net = await fetch(req);
        // Erfolgreiche Antworten im Cache aktualisieren (stilles Update)
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch {
        // Offline: versuche aus dem Cache zu bedienen
        const cached = await caches.match(req);
        if (cached) return cached;

        // Optionaler Offline-Fallback für Navigationsanfragen
        if (req.mode === "navigate") {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }

        // Letzter Ausweg: generische Antwort
        return new Response("Offline – keine zwischengespeicherte Ressource gefunden.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })()
  );
});
