# DigitalGate PWA — native feel notes

## What was slow (fixed in `d342704`)

1. **Manifest `display: "browser"`** — installed “app” still showed Safari/Chrome chrome.
2. **Sibling layouts each remounted `PlatformShellLoader`** — navigating `/dashboard` ↔ `/apps/*` ↔ `/command` tore down the sidebar and re-hit Clerk + WordPress portal + org settings every time.
3. **Onboarding sync awaited on every shell render** — blocked paint on a WordPress→Postgres path (even when throttled).
4. **`fetchPortalMe` used `cache: "no-store"`** — no short-lived reuse across soft navigations.
5. **Almost no route `loading.tsx`** — content areas went blank instead of skeleton.
6. **Service worker called `skipWaiting()` immediately** — no clear “Update available” UX; easy to feel stuck between old/new assets.

## What `d342704` already shipped

| Area | Change |
|------|--------|
| Routes | Shared `src/app/(shell)/layout.tsx` for dashboard / apps / command / support / onboarding |
| PWA | `display: "standalone"`, theme-color viewport, apple-web-app meta, offline shell |
| SW | Waiting worker + **Update available — Refresh** banner |
| Shell | Onboarding sync moved to `after()`; portal/me SWR 45s |
| UX | Shell `loading.tsx` skeleton; view transitions + `prefers-reduced-motion` |
| Headers | See `next.config.ts` (sw/manifest no-cache; brand + `_next/static` cacheable) |

## What we added after (this pass)

| Area | Change |
|------|--------|
| Auth / PWA | Clerk **Frontend API proxy** (`/__clerk`) so session handshake stays on `app.digitalgate.com.au` (inside manifest scope) — see [CLERK-AUTH-SETTINGS.md](./CLERK-AUTH-SETTINGS.md) |
| Manifest | `start_url` with `?source=pwa`, `launch_handler` prefer existing window |
| Perf | Prefetch critical routes after shell idle; `apps/` + `command/` `loading.tsx`; `usePendingAction` + faster CRM/RE create flows |
| Mobile | Shared `dg-break-anywhere`, `dg-table-scroll`, `dg-touch-target`, `dg-btn`; guest list cards on small screens; email/overflow fixes |
| SW | Bump to **`dg-v5`** (bypass `/__clerk`) |

## Clerk handshake opening outside the app (root cause)

Installed PWA scope is `https://app.digitalgate.com.au/` (`scope: "/"`).

When the session token expires without a usable refresh cookie, Clerk middleware redirects to:

`https://clerk.digitalgate.com.au/v1/client/handshake?...&__clerk_hs_reason=session-token-expired-refresh-non-eligible-no-refresh-cookie`

That host is **outside** the PWA scope, so iOS/macOS/Android open Safari/Chrome instead of staying in the standalone window.

**Fix:** Proxy Clerk Frontend API through the app origin (`/__clerk`). Handshake + cookies become same-origin → stay in the PWA.

**Important:** Setting `ClerkProvider` `proxyUrl` / `CLERK_PROXY_URL` **before** Dashboard proxy validates causes `host_invalid` on `/__clerk/v1/environment` and **blank SignIn** (no email/password). Code is opt-in via env only; until then, off-origin Clerk redirects are rewritten to in-app `/login`.

### Ben must do in Clerk Dashboard (exact order)

1. Deploy this build (proxy route live on production).
2. [Clerk Dashboard](https://dashboard.clerk.com) → **Configure → Domains** → **Frontend API** → **Set proxy configuration**.
3. Proxy URL: `https://digitalgate.com.au/__clerk` — wait until **valid**.
4. Vercel Production env: `CLERK_PROXY_URL=https://digitalgate.com.au/__clerk`
5. Confirm sign-in path env is **`/login`** (not Account Portal, not `/sign-in`).
6. Redeploy once after the env var is set.
7. Confirm **Allowed origins / redirect URLs** include `https://app.digitalgate.com.au` (and any Vercel preview hosts you use).

Proxying is a **production-only** Clerk feature (not available for `pk_test_` / localhost).

Also under **Sessions**: long session lifetime, inactivity off or matched — reduces handshake frequency.

## Vercel / headers

Already configured in `next.config.ts` (applies on Vercel):

- `/sw.js` — `no-store` + `Service-Worker-Allowed: /`
- `/manifest.webmanifest` — `no-cache`
- `/brand/*` — `max-age=86400, stale-while-revalidate=604800`
- `/_next/static/*` — `immutable` (hashed assets)

No extra Vercel dashboard header rules required unless you override these.

## How Ben should re-open / reinstall to verify handshake stays in-app

After deploy **and** Clerk Dashboard proxy is enabled:

1. Open the installed DigitalGate app.
2. If a sky **Update available — Refresh** banner appears, tap **Refresh** (picks up `dg-v5`).
3. Confirm **Client login** shows email + password on `/login` (no blank form, no Safari spawn).
4. If the home-screen icon still opens with browser chrome (old install from `display: browser`):
   - **iOS**: delete the home-screen icon → Safari → Share → **Add to Home Screen**.
   - **macOS / Chrome desktop**: uninstall the PWA / remove shortcut → site menu → **Install app**.
   - **Android**: uninstall PWA → Chrome → **Install app** / **Add to Home screen**.
5. Sign in **inside** the installed app (not only in a browser tab) so Clerk cookies are first-party on the app origin via the proxy.
6. Force a session refresh test: leave the app overnight or clear only the short-lived session cookie if you know how — on next open, handshake should navigate within the standalone window to `/__clerk/...` (same host) **or** stay on `/login`, **without** spawning Safari/Chrome.
7. In DevTools (desktop PWA), with proxy enabled, Network should show Clerk FAPI under `app.digitalgate.com.au/__clerk`, not `clerk.digitalgate.com.au`.

## Remaining limits (still a web app)

- Live CRM / RE / Accommodation / Commerce data still requires network (Neon + WordPress + Clerk).
- Offline mode shows `/offline.html` for navigations — not a full offline datastore.
- First load of a shell session still resolves auth + org (cached portal helps subsequent navigations).
- Heavy pages can still feel slow if their own WP/DB queries are slow; skeletons cover the wait, they don’t remove it.
- Until Dashboard proxy is validated **and** `CLERK_PROXY_URL` is set, cold handshake is rewritten to in-app `/login` (email/password) instead of opening `clerk.digitalgate.com.au`.
