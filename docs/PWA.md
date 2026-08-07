# DigitalGate PWA — native feel notes

## What was slow

1. **Manifest `display: "browser"`** — installed “app” still showed Safari/Chrome chrome.
2. **Sibling layouts each remounted `PlatformShellLoader`** — navigating `/dashboard` ↔ `/apps/*` ↔ `/command` tore down the sidebar and re-hit Clerk + WordPress portal + org settings every time.
3. **Onboarding sync awaited on every shell render** — blocked paint on a WordPress→Postgres path (even when throttled).
4. **`fetchPortalMe` used `cache: "no-store"`** — no short-lived reuse across soft navigations.
5. **Almost no route `loading.tsx`** — content areas went blank instead of skeleton.
6. **Service worker called `skipWaiting()` immediately** — no clear “Update available” UX; easy to feel stuck between old/new assets.

## What we changed

| Area | Change |
|------|--------|
| Routes | Shared `src/app/(shell)/layout.tsx` for dashboard / apps / command / support / onboarding |
| PWA | `display: "standalone"`, theme-color viewport, apple-web-app meta, offline shell |
| SW | Waiting worker + **Update available — Refresh** banner (`dg-v3`) |
| Shell | Onboarding sync moved to `after()`; portal/me SWR 45s |
| UX | Shell `loading.tsx` skeleton; view transitions + `prefers-reduced-motion` |
| Headers | See `next.config.ts` (sw/manifest no-cache; brand + `_next/static` cacheable) |

## Vercel / headers

Already configured in `next.config.ts` (applies on Vercel):

- `/sw.js` — `no-store` + `Service-Worker-Allowed: /`
- `/manifest.webmanifest` — `no-cache`
- `/brand/*` — `max-age=86400, stale-while-revalidate=604800`
- `/_next/static/*` — `immutable` (hashed assets)

No extra Vercel dashboard header rules required unless you override these.

## How Ben should refresh the installed app

After deploy:

1. Open the installed DigitalGate app (or the site in Safari/Chrome).
2. If a sky **Update available — Refresh** banner appears, tap **Refresh**.
3. If the home-screen icon still opens with browser chrome (old install from `display: browser`):
   - **iOS**: delete the home-screen icon → Safari → Share → **Add to Home Screen**.
   - **Android/Chrome**: uninstall the PWA / remove shortcut → site menu → **Install app** / **Add to Home screen**.
4. Cold start once so the new service worker (`dg-v3`) precaches the offline shell.

## Remaining limits (still a web app)

- Live CRM / RE / Accommodation / Commerce data still requires network (Neon + WordPress + Clerk).
- Offline mode shows `/offline.html` for navigations — not a full offline datastore.
- First load of a shell session still resolves auth + org (cached portal helps subsequent navigations).
- Heavy pages can still feel slow if their own WP/DB queries are slow; skeletons cover the wait, they don’t remove it.
