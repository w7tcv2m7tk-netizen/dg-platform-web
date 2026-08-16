# WordPress Detach Backlog

**Status:** Executable backlog (validated against code, August 2026)  
**ADR:** [0002 — WordPress as Connector](./adr/0002-wordpress-as-connector.md)  
**Repos:** Gen 2 `dg-platform-web` (this repo) · Gen 1 plugin `dg-platform`

> **North star:** WordPress becomes a **connector** (forms, public mirror, health probes) — not the source of truth for CRM, billing entitlements, support, or booking ops. Gen 2 owns Clerk, Neon tenancy, CRM, commerce, **apex marketing sites** (DG / Roe / CVH / Aëtherra), Acc calendars + platform iCal, and most capture funnels. WP remains for portal/support/health and optional RE mirrors until those phases close.

---

## Current ownership (validated)

| Domain | SoT today | Gen 2 role | Detach phase |
|--------|-----------|------------|--------------|
| Auth / orgs / memberships | **Gen 2** (Clerk + Neon) | Native | — |
| CRM contacts / companies / timeline | **Gen 2** | Native | — |
| Commerce shell (invoices, quotes, Stripe connector) | **Gen 2** | Native | — |
| Platform SaaS billing (in-app checkout) | **Gen 2** (`platform-stripe`) | Dual with WP Payment Links | **P2** |
| Apex marketing sites (DG / Roe / CVH / Aëtherra) | **Gen 2** `Website` + custom-domain renderer | Public SoT; WP apex retired | **P5** ✅ |
| Product funnels (audit / property-report / booking) | **Gen 2** capture APIs + funnel subdomains | Native | **P1** ✅ interim |
| Roe vendor/buyer **capture** | **Gen 2** public forms + optional WP dual-write | Webhook/pull backup | **P1** ✅ interim |
| Roe vendor/buyer **pipeline stages** | **Gen 2** SoT; optional WP write-back via `re.stage_writeback` | Native ops in Gen 2 | **P1** ✅ |
| Properties / listings | **Gen 2** Neon + optional publish mirror to WP | Bidirectional sync legacy | P1 / P5 |
| RE appraisal / buyer consultation bookings | **Gen 2** public booking capture (`/api/public/re-booking`) | WP pull is backup | **P1** ✅ |
| Portal purchase + onboarding profile | **WP** (`/portal/me`) | Mirror into `organisation.settings` | **P2** |
| Support chat | **WP** (`dg_support_*` tables) | Thin proxy | **P3** |
| Website health | **WP** (`/site/health`) + Gen 2 native health | Read-only UI | **P3** |
| CVH stays | **Gen 2 StayBooking** SoT | Ops create in Gen 2; WP dual-write optional | **P4** ✅ interim |
| CVH units / availability / housekeeping | **Gen 2 `AccommodationUnit`** SoT (apex retired) | Manual blocks → platform iCal for Airbnb/Booking | **P4** ✅ |
| Public sites / headless CMS | **Gen 2** for brand apex; WP only where still linked | RE property/agent publish optional | **P5** ✅ interim |

**Order by detach value:** Portal/billing (P2) → support+health (P3) → finish CVH booking engine edges (P4) → drop remaining WP mirrors (P5).

---

## Phase 0 — Guardrails (do first, cheap)

### WP-D-000 · P0 — Connector contract freeze

| Field | Detail |
|-------|--------|
| **Why** | Stop inventing new WP SoT while detach tickets land. |
| **Touchpoints** | `docs/adr/0002-wordpress-as-connector.md`; `docs/connectors/CONNECTOR-SPECIFICATION.md`; WP rule: connector endpoints + bugfixes only (`class-crm-dev-api.php`, `class-acc-dev-api.php`, `class-client-portal-api.php`). |
| **Done means** | Team agrees: no new Gen 1 domain modules; new capture/ops features ship on Gen 2 or as thin WP → Platform webhooks. |
| **Effort** | S |
| **Depends on** | — |

### WP-D-001 · P0 — Inventory env + per-org connector keys

| Field | Detail |
|-------|--------|
| **Why** | Detach work fails silently when Roe/CVH/DG keys cross hosts. |
| **Touchpoints** | `packages/platform-core/src/connectors/wordpress/org-connector.ts` (`resolveOrgWordPressConnector`, `WP_CONNECTOR_PRESETS`, `envWpApiKeyForBaseUrl`); `src/lib/org-wordpress-connector.ts`; `src/lib/dg-api.ts` (`getApiBase`, `getWpConnectorBase`, `listWpHealthSites`, `DG_WP_ACCOMMODATION_SITES`); Settings UI `src/components/settings/WordPressConnectorPanel.tsx`, `src/app/dashboard/settings/connectors/page.tsx`. |
| **Done means** | Doc table of which env vars hit which host; Roe/CVH/DG never share keys; connector status probe matches vertical (`probeOrgWordPressConnector` / accommodation summary vs vendor leads). |
| **Effort** | S |
| **Depends on** | WP-D-000 |

---

## Phase 1 — Roe RE SoT (ops independence)

Goal: agents run vendor/buyer pipeline and property ops in Gen 2 **without** opening wp-admin. Capture can still start on WP temporarily if Gen 2 has create API + optional webhook.

### WP-D-101 · P1 — `POST /api/v1/leads` create (match catalog)

| Field | Detail |
|-------|--------|
| **Status** | ✅ Done (Aug 2026) — create vendor/buyer leads in Neon; sync actions unchanged |
| **Why** | Catalog claims create; route only ran WP sync actions — blocked Gen 2 capture. |
| **Touchpoints** | `src/app/api/v1/leads/route.ts`; `packages/platform-core/src/leads/index.ts` (`createLead`); `CreateLeadForm.tsx`. |
| **Done means** | Authenticated create for vendor + buyer leads in Neon (`metadata.lead_type` / `source: buyer_enquiry`); upserts Contact; sync actions remain as separate `action` bodies. Convert → Opportunity via `POST /api/v1/opportunities`. |
| **Effort** | M |
| **Depends on** | WP-D-001 |

### WP-D-102 · P1 — Add vendor / buyer lead UI (no WP required)

| Field | Detail |
|-------|--------|
| **Status** | ✅ Done (Aug 2026) — Add lead on vendor + buyer pipelines |
| **Why** | Pipeline UI only offered “Sync from WordPress” — could not seed Roe without WP. |
| **Touchpoints** | `src/components/re/CreateLeadForm.tsx`; `VendorLeadPipeline.tsx`; `BuyerLeadPipeline.tsx`. |
| **Done means** | “Add lead” form → `POST /api/v1/leads`; list/detail work with zero WP sync. |
| **Effort** | M |
| **Depends on** | WP-D-101 |

### WP-D-103 · P1 — Public capture → Gen 2 (webhook or embedded)

| Field | Detail |
|-------|--------|
| **Status** | 🔶 Dual-write shipped (Aug 2026) — WP forms still create; plugin v10.68+ `DG_RE_Platform_Sync` → `POST /api/webhooks/dg-leads`; pull-sync backup. Full Gen 2-first public form is later. |
| **Why** | Roe inbound SoT is still WP property-report / enquiry forms. |
| **Touchpoints** | WP: `class-re-platform-sync.php`; Gen 2: `src/app/api/webhooks/dg-leads/route.ts`; `packages/platform-core/src/leads/public-capture.ts`. |
| **Done means** | Form submit creates Neon `Lead` (+ Contact) within seconds; WP store optional mirror; pull-sync becomes backup not primary. |
| **Effort** | L |
| **Depends on** | WP-D-101 |

### WP-D-104 · P1 — Optional stage write-back (or explicit one-way)

| Field | Detail |
|-------|--------|
| **Status** | ✅ Done (Aug 2026) — Gen 2 is SoT; optional write-back behind `re.stage_writeback` → WP `PATCH /leads/vendor|buyer/{id}` (plugin v10.68+) |
| **Why** | Stages update in Neon only (`updateLeadStage` / `updateBuyerLeadStage`) — WP admin drifts if still used. |
| **Touchpoints** | `packages/platform-core/src/leads/index.ts` (`maybeWriteBackLeadStageToWordPress`); WP `class-crm-dev-api.php` PATCH handlers. |
| **Done means** | Either (a) Gen 2 → WP stage PATCH when connector present, or (b) documented one-way: Gen 2 is SoT, WP admin read-only for pipeline. |
| **Effort** | M |
| **Depends on** | WP-D-102 |

### WP-D-105 · P1 — RE booking capture on Gen 2

| Field | Detail |
|-------|--------|
| **Status** | ✅ Done (Aug 2026) — Gen 2 public capture at `/api/public/re-booking` + `RoeBookingCapture`; WP pull remains backup |
| **Why** | Appraisal / buyer consultation bookings should originate on Gen 2. |
| **Touchpoints** | Gen 2: `packages/platform-core/src/real-estate/public-booking.ts`; `src/components/websites/RoeBookingCapture.tsx`; `src/app/api/public/re-booking/route.ts`. Legacy pull: `syncReBookingsFromWordPress`. |
| **Done means** | Create/list RE bookings as `Lead` with `source: re_booking` from Gen 2 API/UI; WP calendar form posts to Gen 2 or dual-writes. |
| **Effort** | L |
| **Depends on** | WP-D-101 |

### WP-D-106 · P1 — Property SoT clarity + deprecate WP→Neon as primary

| Field | Detail |
|-------|--------|
| **Why** | Neon already creates/updates properties and publishes to WP; inbound sync is for legacy catch-up. |
| **Touchpoints** | `packages/platform-core/src/properties/index.ts` (`createProperty`, `updatePropertyStatus`, `updatePropertyListing`); `sync-property-publish.ts` (`publishPropertyToWordPress`, `maybeAutoPublishPropertyToWordPress`); `sync-properties-from-wordpress.ts`; `src/app/api/v1/properties/[id]/route.ts` (`publish_to_website`); `src/app/api/v1/re/listings/sync/route.ts`; `PublishToWebsiteButton.tsx`. |
| **Done means** | Docs + UI label Neon as SoT; WP publish = public mirror; WP→Neon sync flagged “legacy import”; Roe agents stop editing property CPT in wp-admin. |
| **Status** | ✅ UI SoT copy on Properties page; create/list on Gen 2. |
| **Effort** | S |
| **Depends on** | WP-D-000 |

### WP-D-107 · P1 — Stop auto-sync as the only data path on RE pages

| Field | Detail |
|-------|--------|
| **Why** | Pages still auto-pull WP every 4h — masks missing Gen 2 create. |
| **Touchpoints** | `src/lib/wordpress-sync.ts` (`WP_SYNC_INTERVAL_MS`, `autoSyncWordPress*IfNeeded`); callers on RE pages. |
| **Done means** | After WP-D-102/103, auto-sync is optional/manual or webhook-driven; dashboard works offline from WP. |
| **Status** | ✅ RE auto-sync gated behind `re.wp_auto_sync` (default **off**). Manual Sync buttons remain. Acc pulls unchanged. |
| **Effort** | M |
| **Depends on** | WP-D-102, WP-D-103 |

**P1 exit:** Roe agent daily path (leads → appraisal → listing → offers → past client) works with WP connector **disconnected**, except optional public listing mirror.

---

## Phase 2 — Portal / billing entitlements

### WP-D-201 · P2 — Replace `fetchPortalMe` page-context dependency

| Field | Detail |
|-------|--------|
| **Why** | Every platform page still bridges WP for purchase/onboarding identity. |
| **Touchpoints** | `src/lib/dg-api.ts` (`fetchPortalMe`); `src/lib/platform-page-context.ts` (`getPlatformPageContext`); `src/lib/org-onboarding-sync.ts` (`ensureOrganisationOnboardingSync`); `packages/platform-core/src/org/onboarding-profile.ts` (`syncOrganisationFromPortal`); `packages/platform-core/src/connectors/portal-types.ts`; WP `includes/class-client-portal-api.php` (`/portal/me`), `class-client-portal.php`. |
| **Done means** | Page context reads Neon `organisation.settings` only; WP pull is migration/admin tool, not request path. |
| **Effort** | L |
| **Depends on** | WP-D-202 or WP-D-203 |

### WP-D-202 · P2 — Single checkout funnel (Gen 2 Stripe wins)

| Field | Detail |
|-------|--------|
| **Why** | Dual Stripe: WP Payment Links provision WP then push Gen 2; in-app Gen 2 checkout never writes WP. |
| **Touchpoints** | Gen 2: `packages/platform-core/src/billing/platform-stripe.ts` (`createPlatformCheckoutSession`, `provisionFromPlatformCheckout`); `src/app/api/v1/billing/checkout/route.ts`, `portal/route.ts`; `src/app/api/webhooks/stripe/route.ts`; `BillingActions.tsx`; billing settings page (still also `fetchPortalMe`). WP: `includes/class-stripe-billing.php` (`DG_Stripe_Billing`); `includes/class-growth-engine-sync.php` (`sync_platform_after_purchase`, `push_onboarding_sync`); Gen 2 webhook `src/app/api/webhooks/dg-onboarding-sync/route.ts`. |
| **Done means** | New purchases hit Gen 2 Checkout only; apps/tier written to Neon; WP Payment Link path deprecated or redirects; `dg-onboarding-sync` optional for legacy only. |
| **Effort** | L |
| **Depends on** | WP-D-001 |

### WP-D-203 · P2 — Gen 2-native onboarding (stop `POST` to WP `/onboarding`)

| Field | Detail |
|-------|--------|
| **Why** | Signup still posts onboarding to WP SoT. |
| **Touchpoints** | `src/lib/dg-api.ts` (`submitOnboarding`); `src/components/SignupForm.tsx`; `src/app/api/onboarding/route.ts`; WP `includes/class-client-onboarding.php`. |
| **Done means** | Onboarding writes Neon profile + apps; WP form retired or thin redirect. |
| **Effort** | M |
| **Depends on** | WP-D-202 |

### WP-D-204 · P2 — Retire Growth Engine WP → Gen 2 entitlement push

| Field | Detail |
|-------|--------|
| **Why** | Last hard dependency tying SaaS entitlements to WP contact meta. |
| **Touchpoints** | WP `class-growth-engine-sync.php`; Gen 2 `dg-onboarding-sync` webhook; `syncOrganisationFromPortal`. |
| **Done means** | No production webhook required for apps to enable; settings.apps owned by Gen 2 billing + admin. |
| **Effort** | M |
| **Depends on** | WP-D-201, WP-D-202 |

**P2 exit:** New customer can pay + onboard + see correct apps with `DG_API_BASE_URL` unset.

---

## Phase 3 — Support + website health

### WP-D-301 · P3 — Support conversations in Gen 2 (or external)

| Field | Detail |
|-------|--------|
| **Why** | Live Support UI is a WP proxy; staff inbox is wp-admin only. |
| **Touchpoints** | Gen 2: `src/lib/support-chat.ts` (`fetchSupportConversation`, `postSupportMessage` → `/support/platform/*`); `src/app/api/v1/support/conversation/route.ts`, `messages/route.ts`; `SupportChatPanel.tsx`. WP: `includes/class-client-support.php`, `class-support-ai.php`, `templates/admin/support-inbox.php`. Roadmap: `command.support`. |
| **Done means** | Messages stored in Neon (or Intercom); Gen 2 staff UI; WP proxy deleted; no WP portal-link gate. |
| **Effort** | L |
| **Depends on** | WP-D-201 (identity without WP linked email) |

### WP-D-302 · P3 — Health Centre without `/site/health`

| Field | Detail |
|-------|--------|
| **Why** | Health SoT is WP Site Tools; Gen 2 only displays. |
| **Touchpoints** | Gen 2: `src/lib/dg-api.ts` (`fetchWpSiteHealth`, `listWpHealthSites`, `DG_WP_HEALTH_SITES`); `src/app/api/v1/websites/health/route.ts`; `src/app/apps/websites/health/page.tsx`; `HealthCentreDashboard.tsx`; `packages/platform-core/src/websites/*`; overview probes in `src/lib/overview-connectors.ts`. WP: `includes/site-tools/class-site-tools-dev-api.php`, `class-site-tools-health.php`. |
| **Done means** | Gen 2 runs PSI/SSL/uptime against public URL; snapshots in Twin/Postgres; `DG_WP_HEALTH_SITES` optional. |
| **Effort** | L |
| **Depends on** | WP-D-000 |

### WP-D-303 · P3 — Connector-only health endpoint (interim)

| Field | Detail |
|-------|--------|
| **Why** | Until Gen 2 probes exist, keep WP `/site/health` as **connector metric feed**, not product SoT. |
| **Touchpoints** | Same as WP-D-302; align with `CONNECTOR-SPECIFICATION.md` “Site health → Twin metrics”. |
| **Done means** | UI copy + twin capture treat score as connector input; roadmap `websites.health` description updated. |
| **Effort** | S |
| **Depends on** | — (can ship parallel) |

**P3 exit:** Support + health usable if WP digitalgate.com.au is down (or degraded with clear connector status).

---

## Phase 4 — CVH booking SoT

### WP-D-401 · P4 — StayBooking as read SoT (stop live WP fallback in UI)

| Field | Detail |
|-------|--------|
| **Status** | ✅ Done (Aug 2026) — bookings / payments / check-ins read Neon `StayBooking`; API no longer falls back to live WP; `?source=wp` is debug probe only |
| **Why** | Bookings API preferred Postgres if rows exist else live WP — ops still tied to WP uptime. |
| **Touchpoints** | `packages/platform-core/src/accommodation/bookings.ts`; `src/lib/accommodation-stay-bookings.ts`; `src/app/api/v1/accommodation/route.ts`; pages under `src/app/(shell)/apps/accommodation/{bookings,payments,check-ins}`; `WP_ACC_SYNC_INTERVAL_MS` (15m pull). |
| **Done means** | UI always reads `StayBooking`; sync is background (or seed-on-empty); `?source=wp` admin/debug only. |
| **Effort** | M |
| **Depends on** | WP-D-001 |

### WP-D-402 · P4 — Units / guests / availability / housekeeping in Neon

| Field | Detail |
|-------|--------|
| **Status** | 🔶 Soft SoT shipped (Aug 2026) — Prisma `AccommodationUnit`; sync + ops UI/API prefer Neon when rows exist (or `acc.units_sot`); availability derived from units + StayBooking; guests already Contact-centric |
| **Why** | Those resources were still live `fetchWpAccommodation*` with no Postgres models (except bookings cache + guest profiles). |
| **Touchpoints** | `packages/database/prisma/schema.prisma` (`AccommodationUnit`); `packages/platform-core/src/accommodation/units.ts`; `src/lib/accommodation-units.ts`; Acc API `resource=units|availability|housekeeping`; `POST action=sync_units`. |
| **Done means** | Prisma models for units/guests/availability; Gen 2 CRUD; housekeeping SoT in Gen 2 with optional WP mirror. |
| **Effort** | L |
| **Depends on** | WP-D-401 |

### WP-D-403 · P4 — Public book-now → Gen 2 (or dual-write)

| Field | Detail |
|-------|--------|
| **Status** | 🔶 Dual-write live; Gen 2-first ops create **soft-on** (`acc.gen2_first_booking` unset/true) when units SoT; set false for WP-first. Public book-now still WP. |
| **Why** | Guest booking + Stripe still WP accommodation module. |
| **Touchpoints** | WP `class-acc-platform-sync.php`; Gen 2 `createStayBookingGen2First`; `src/app/api/v1/accommodation/route.ts` `create_booking`. |
| **Done means** | New stays created in Gen 2 first; WP calendar is display or retired; CVH guest Stripe keys documented separately from SaaS Stripe. |
| **Effort** | L |
| **Depends on** | WP-D-402 (for Gen 2-first); dual-write does not. |

### WP-D-404 · P4 — Reverse or drop housekeeping PATCH to WP

| Field | Detail |
|-------|--------|
| **Status** | 🔶 Soft flip (Aug 2026) — when units/HK SoT active, PATCH writes Neon first then optional WP mirror (`acc.housekeeping_sot`) |
| **Why** | Only Gen 2 → WP write-back in accommodation today; after SoT flip it becomes wrong-direction. |
| **Touchpoints** | `updateUnitHousekeeping`; `src/app/api/v1/accommodation/housekeeping/route.ts`. |
| **Done means** | Housekeeping updates persist in Gen 2; WP patch removed or becomes optional mirror. |
| **Effort** | S |
| **Depends on** | WP-D-402 |

**P4 exit:** CVH ops dashboard runs from Neon with WP connector offline (public book-now may still be WP until WP-D-403 Gen 2-first).

---

## Phase 5 — Public / headless

### WP-D-501 · P5 — Property/agent publish remains connector write (explicit)

| Field | Detail |
|-------|--------|
| **Why** | Only real Gen 2 → public-site path today; keep as connector, not reverse SoT. |
| **Touchpoints** | `sync-property-publish.ts`, `sync-agent-publish.ts` (`publishMembershipToWordPressAgent`); WP `DG_CRM_Dev_API::upsert_property` / `upsert_agent`; `PublishToWebsiteButton.tsx`. |
| **Done means** | Documented as “WordPress public mirror”; failures surface as connector health, not CRM blockers. |
| **Effort** | S |
| **Depends on** | WP-D-106 |

### WP-D-502 · P5 — Headless / Website Studio (net-new, not detach)

| Field | Detail |
|-------|--------|
| **Why** | Studio/content/funnels/sites are placeholders — nothing to detach yet. |
| **Touchpoints** | `src/app/apps/websites/studio/page.tsx`, `content/page.tsx`, `funnels/page.tsx`, `sites/page.tsx` (`AppFeaturePlaceholder`); roadmap `websites.studio|content|funnels|sites`; `docs/websites/WEBSITES-ARCHITECTURE.md`; manifest `packages/platform-core/src/apps/builtins/websites.ts`. |
| **Done means** | Gen 2 can publish a page/site without WP; WP connector optional for legacy Oxygen sites. |
| **Effort** | L |
| **Depends on** | Platform Core + P1–P3 stability |

### WP-D-503 · P5 — Slim WP plugin (connector-only release)

| Field | Detail |
|-------|--------|
| **Why** | End-state of ADR 0002. |
| **Touchpoints** | Entire `dg-platform` plugin; `docs/DEPLOY-WP-PLUGIN.md`; keep: Dev API lead webhook, property upsert, optional health; remove/disable: portal SoT, support SoT, SaaS Stripe, admin CRM as primary. |
| **Done means** | Versioned “connector” plugin for customer sites; DigitalGate.com.au marketing can stay WP without being Platform Core. |
| **Effort** | L |
| **Depends on** | P1–P4 exits |

---

## Suggested sprint order (top of queue)

| # | ID | Title | Effort |
|---|-----|-------|--------|
| 1 | WP-D-101 | Implement real lead create on `POST /api/v1/leads` | M |
| 2 | WP-D-102 | Add vendor/buyer lead UI | M |
| 3 | WP-D-106 | Label Neon property SoT; WP publish = mirror | S |
| 4 | WP-D-103 | Wire Roe forms → Gen 2 create (webhook) | L |
| 5 | WP-D-202 | Collapse billing to Gen 2 Stripe checkout | L |

Then: WP-D-201 → WP-D-301 → WP-D-401 → WP-D-402 → WP-D-502.

---

## Already detached (do not re-build)

- Clerk auth + org membership (`packages/platform-core` org/memberships; Clerk webhooks)
- CRM contacts / companies / timeline
- RE offers, past-client, Neon reports (`src/app/api/v1/re/offers|past-client|reports`)
- Commerce payment connector registry + `/api/webhooks/stripe` commerce branch
- In-app platform billing session APIs (need entitlement SoT cleanup in P2)

---

## Code index (quick)

| Concern | Gen 2 | WP (`dg-platform`) |
|---------|-------|---------------------|
| Connector resolve | `org-connector.ts`, `org-wordpress-connector.ts` | Dev API auth |
| Sync orchestration | `src/lib/wordpress-sync.ts` | — |
| WP HTTP client | `src/lib/dg-api.ts` | REST `digitalgate/v1` |
| Vendor/buyer sync | `sync-vendor-leads.ts`, `sync-buyer-leads.ts` | `class-crm-dev-api.php`, form handlers |
| Property publish | `sync-property-publish.ts` | `upsert_property` |
| RE bookings | `real-estate/bookings.ts` | `/bookings/recent` |
| Stay bookings | `accommodation/bookings.ts` | `class-acc-dev-api.php` |
| Portal bridge | `fetchPortalMe`, `onboarding-profile.ts` | `class-client-portal-api.php` |
| Support proxy | `support-chat.ts` | `class-client-support.php` |
| Health | `fetchWpSiteHealth` | `class-site-tools-*-health.php` |

---

## Related docs

- [ROADMAP.md](./ROADMAP.md) — execution roadmap (points here for detach)
- [CONNECTOR-SPECIFICATION.md](./connectors/CONNECTOR-SPECIFICATION.md)
- [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md)
- [PLATFORM-API.md](./PLATFORM-API.md)
- In-app progress: `packages/platform-core/src/roadmap/index.ts` (`detach.*` items)
