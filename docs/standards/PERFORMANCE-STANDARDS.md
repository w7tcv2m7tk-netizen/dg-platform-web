# Platform Performance Standards

**Goal:** The web app should feel like desktop software — Linear, Notion, Slack. Users shouldn't notice they're in a browser.

---

## Targets (engineering goals)

| Metric | Target |
|--------|--------|
| Dashboard initial load | < 2 seconds |
| Page navigation | < 300 ms |
| Search results | < 200 ms |
| AI responses (first token) | < 2 seconds |
| CRM updates | Instant (optimistic UI) |
| File uploads | Background with progress |
| Reports | Async generation + notification |

If pages take **> 300 ms** to become interactive, users notice. **> 1–2 s** breaks flow.

---

## Root causes (not "because it's a website")

- Server-side rendering delays
- Database queries (N+1, missing indexes)
- API round trips (WordPress connector, external probes)
- Loading too much data at once
- Duplicate auth/session resolution per request
- Network latency
- Unoptimised React (re-renders, heavy client bundles)
- Cache misses

Native apps don't automatically fix these — optimise the web platform first.

---

## Phase 1 — Web app feels like software (now)

| Technique | Status |
|-----------|--------|
| Request deduplication (`React.cache` for session) | ✅ |
| Parallel data fetching (dashboard) | ✅ |
| Non-blocking background sync (WP leads) | ✅ |
| Skeleton loaders (`loading.tsx`) | ✅ |
| Route prefetch (Next.js Link) | ✅ default |
| PWA manifest (installable) | ✅ |
| Efficient DB queries (limits, indexes) | Ongoing |

### Implementation patterns

1. **One session fetch per request** — `getPlatformPageContext()` in `src/lib/platform-page-context.ts`
2. **Don't await slow IO before critical path** — WP sync runs in background on dashboard
3. **Streaming + skeletons** — show layout immediately, stream data
4. **Optimistic UI** — CRM create/update reflects instantly, reconcile on response (roadmap)
5. **Virtualised tables** — contacts/leads lists at scale (roadmap)

---

## Phase 2 — PWA polish

| Feature | Status |
|---------|--------|
| Web app manifest | ✅ |
| Install prompt (Add to Home Screen) | Browser-native |
| Service worker / offline shell | Planned |
| Push notifications | Planned |
| Offline CRM read + sync queue | Planned |

---

## Phase 3 — Mobile apps (industry-specific)

When use cases differ materially from desktop:

- **Real Estate** — inspections, maps, camera, voice notes
- **Accommodation** — housekeeping, check-ins, guest messages
- **DigitalGate staff** — alerts, support, platform health

---

## Phase 4 — Desktop app (Electron / Tauri)

When users need OS integration: file access, multi-window, background sync, native notifications.

---

## Measuring

- Vercel Speed Insights / Web Vitals (LCP, INP, CLS)
- Server timing logs for slow routes (`/dashboard`, `/apps/crm/contacts`)
- Manual: navigation should feel instant after first load

---

## Related

- [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md) — API-first, no direct DB from UI
- [API-STANDARDS.md](./API-STANDARDS.md)
