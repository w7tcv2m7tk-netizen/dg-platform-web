import type { NextConfig } from "next";

/**
 * PWA / cache notes (Vercel):
 * - `/sw.js` must never be long-cached or installs stick on an old worker.
 * - `/_next/static/*` is hashed; SWR-friendly Cache-Control is safe.
 * - HTML navigations stay network-first via the service worker (offline.html fallback).
 * - Do not put `Cache-Control: immutable` on `/manifest.webmanifest` — installs need updates.
 */
const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
