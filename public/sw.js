/* DigitalGate PWA service worker — offline shell + static asset cache */
const VERSION = "dg-v3";
const STATIC_CACHE = `dg-static-${VERSION}`;
const RUNTIME_CACHE = `dg-runtime-${VERSION}`;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/brand/icon-light.png",
  "/apple-icon.png",
  "/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  // Stay in waiting until the client accepts the update (banner → SKIP_WAITING).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/offline.html" ||
    pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML navigations or API — always network (offline fallback only).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        // Stale-while-revalidate for hashed/_next and brand assets.
        return cached || network;
      }),
    );
  }
});
