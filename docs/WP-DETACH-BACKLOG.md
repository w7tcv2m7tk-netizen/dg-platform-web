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

## Accommodation booking dependency register (Phase 7 audit)

Dependency-level companion to the phase tickets above. Every remaining
WordPress touchpoint in the accommodation booking path, classified. Verified
against source; no database or plugin access was available.

**Classification:** **A** required legacy compatibility · **B** redundant,
removable · **C** genuine architectural dependency · **D** unknown / externally
blocked.

**Reachability** assumes the standard connector, which `resolveWordPressConnector`
blanks for Gen 2 marketing apex hosts, and `refuseAccWpOnGen2Apex`, which makes
every `fetchWp*` / `patchWp*` / `createWp*` / `deleteWp*` call 404 on those
hosts. So for CVH, Roe, DigitalGate and Aëtherra the WP legs below are already
dead; they remain live only for a tenant pointing at a non-apex WordPress host.

| # | Dependency | File | Authority | Dup? | Can overwrite newer Gen 2? | Apex | Class | Action |
|---|---|---|---|---|---|---|---|---|
| 1 | `wp_then_neon` create | `api/v1/accommodation/route.ts` POST `create_booking` | WP writes first | No — matched on `externalWpId` | Yes, via mirror upsert | Dead (Neon-first default) | **C** | Keep for non-apex; not reachable for apex brands |
| 2 | Guest PATCH WP-first | same, `resource="guests"` | **WordPress** | No | Yes | Dead | **B/D** | Should be Neon-first; blocked on unknown external callers — see below |
| 3 | Housekeeping PATCH WP-only | same + `housekeeping/route.ts` | WP when no HK SoT | n/a | No | Dead (HK SoT) | **C** | Remove once every tenant has units |
| 4 | Seed-from-WP-when-empty | `lib/accommodation-stay-bookings.ts` | Neon reads; WP seeds | No | Yes | Attempted, fails | **C** | Skip the attempt when the connector is apex-retired |
| 5 | `dg-stay-booking` webhook | `api/webhooks/dg-stay-booking/route.ts` | WP event → Neon | No | Yes | **Live — no apex gate** | **A/D** | Required while public book-now is WP (WP-D-403) |
| 6 | `syncAccommodationBookingsFromWordPress` | `accommodation/bookings.ts` | WP → Neon | No | Yes | Dead | **C** | Core import primitive; keep |
| 7 | `syncWordPressAccBookings` | `lib/wordpress-sync.ts` | WP → Neon | No | Yes | Dead | **C** | Keep; apex auto-sync already skipped |
| 8 | Legacy OTA WP availability pull | accommodation route, `sync_ota` fallback | WP → Neon | No | Yes | Dead | **A** | Keep until every unit has an iCal URL |
| 9 | OTA fallback to #7 | accommodation route | WP → Neon | No | Yes | Dead | **C** | Retire with #8 |
| 10 | GET WP availability | accommodation route | WP read when no units SoT | n/a | No | Dead | **C** | Remove once all tenants on units SoT |
| 11 | Guests page WP pull | `apps/accommodation/guests/page.tsx` | Neon displays; WP overwrites profiles | No | Yes | Dead | **C** | Drop pull once guests fully in Contacts |
| 12 | GET WP housekeeping | accommodation route | WP read when no HK SoT | n/a | No | Dead | **C** | Retire with #3 |
| 13 | GET WP summary | accommodation route + overview | **WordPress only** | n/a | No | **Dead → broken metric** | **D** | Needs a Neon-derived summary; apex dashboards get a 404 today |
| 14 | Booking DELETE WP mirror | accommodation route DELETE | **Neon first** | n/a | No | Neon only | **C** | Correct already |
| 15 | Unit PATCH WP mirror / unit pull | accommodation route + `units.ts` | **Neon first** | n/a | Yes on pull | Neon only | **C** | Correct already |

### Nothing qualified for removal (re-confirmed in Phase 8 with plugin evidence)

No dependency is safely removable without external evidence. Each is either
inbound from a WordPress install we cannot inspect (#5), or still the only path
for a tenant whose connector points at a non-apex host (#1, #6–#12). Items #14
and #15 are already Neon-first and correct.

Two are worth Ben's decision rather than silent change:

- **#2 guest PATCH** is the last WP-first write in the accommodation surface and
  is inconsistent with the booking PATCH fix (WP-D-401 pattern). It has no UI
  caller — the UI uses the Neon-first `POST update_guest_profile` — so its only
  possible consumers are external. Converting it is not a pure refactor either:
  the Neon-first path is keyed on `contactId` and does not accept the `tags`,
  `address` or `source` fields this endpoint takes, so delegating to it would
  silently drop writes. Removing or reshaping it needs confirmation that nothing
  external calls it.
- **#13 WP summary** leaves apex dashboards with a broken metric, because the
  refuse-on-apex guard returns 404 and there is no Neon equivalent. That is new
  functionality, not detachment.

### Stale WordPress data can overwrite newer Gen 2 edits

The most significant integrity finding, and a source-of-truth policy question
rather than a bug to patch unilaterally.

Every WP→Neon import path (#4, #5, #6, #7, #8, #9) funnels into
`upsertStayBookingFromWpRow`, which matches on `organisationId + externalWpId`
and then, if **any** field differs, writes the WordPress values over the Neon
row. There is no recency comparison — no `updatedAt` check, and although
`gen2_origin` is stamped on create it is never read by the upsert.

So: an operator edits a booking in Gen 2 (Neon-first since WP-D-401), the
WordPress row stays stale, and the next sync, seed or webhook carrying that WP
row silently reverts the operator's edit. Non-date changes skip the overlap
check entirely, so nothing surfaces the conflict. The same shape applies to
`upsertAccommodationUnitFromWpRow` (partial patch, so narrower) and
`upsertGuestFromWpRow`.

This is latent for the four apex brands, whose WP fetches are refused, and live
for any tenant on a non-apex host with sync enabled.

Fixing it means deciding what happens when both sides changed — Neon wins and
legitimate WordPress edits stop landing, or WordPress wins and operator edits
keep getting reverted. That is a source-of-truth policy call, so it is recorded
here rather than changed. A recency guard (`gen2_origin` plus an
`updatedAt`/`wp_mirrored_at` comparison) is the mechanism once the policy is set.

### Phase 9 closure — classification against the current code

Re-checked after the Phase 8/9 changes. The objective is **zero unnecessary
WordPress authority over Gen 2 data**, not zero WordPress code, so endpoints are
not removed merely because the four apex brands no longer reach them.

| Classification | Meaning |
|---|---|
| **Required legacy connector** | genuinely still required |
| **Compatibility only** | required temporarily for legacy installs |
| **Safe to remove** | no legitimate caller remains |
| **Source-of-truth risk** | can incorrectly overwrite Gen 2 |
| **Unknown** | needs external evidence |

Each dependency carries exactly one classification. **Overwrite** means "can this
path write WordPress values over Gen 2 data".

| # | Dependency | Current behaviour | Initiated by | Authoritative | Overwrite? | Non-apex needs it | Affects apex brands | Classification | Recommended action | Blocking prerequisite |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `wp_then_neon` create | WordPress creates, Neon mirrors the created row | Gen 2 operator | **WordPress**, by design on this path | Only the row it just created | Yes — orgs with `acc.gen2_first_booking=false` or no Neon units | No — unreachable, Neon-first is default | Compatibility only | Keep; retires as tenants gain units | All acc tenants on units SoT |
| 2 | Guest PATCH WP-first | WordPress written first, 422 if it fails, then Neon from the request | External API caller | **WordPress** | Guest profile fields | Unknown | No — 422 via apex refusal | **Unknown** | Leave until callers are known | Proof no external caller uses it, plus `tags`/`address`/`source` added to the Neon-first path |
| 3 | Housekeeping PATCH WP-only | WordPress is the only write target when HK SoT is off | Gen 2 operator | **WordPress** on this branch | No — WP-only, no Neon write | Yes — orgs without Neon units | No — HK SoT active | Compatibility only | Remove the WP-only branch when every tenant has units | Universal HK SoT |
| 4 | Seed-from-WP-when-empty | First ops load pulls bookings when Neon is empty | Gen 2 page load | **Neon** for reads; WP seeds once | Via the import, now governed by the conflict rule | Yes | Attempted, fails harmlessly | Compatibility only | Skip the attempt when the connector is apex-retired | — |
| 5 | `dg-stay-booking` webhook | WordPress pushes a created/confirmed booking into Neon | **WordPress** | **Neon** — this is ingress, not authority | Via the import, governed by the conflict rule | Yes | **Yes — no apex gate, still live** | Required legacy connector | Keep while public book-now is WordPress | Public booking fully Gen 2-native (WP-D-403) |
| 6 | `syncAccommodationBookingsFromWordPress` | Pull primitive, upserts each row | Gen 2 operator/page | **Neon** | Governed by the conflict rule | Yes | No — fetch refused | Compatibility only | Keep as the migration primitive | — |
| 7 | `syncWordPressAccBookings` | Windowed pull wrapper around #6 | Gen 2 operator/page | **Neon** | Governed by the conflict rule | Yes | No — refused, auto-sync skipped | Compatibility only | Keep | — |
| 8 | Legacy OTA WP availability pull | WordPress OTA sync then availability pull, as a fallback | Gen 2 operator | **Neon** | Governed by the conflict rule | Yes — units lacking iCal URLs | No — apex short-circuits | Compatibility only | Remove once every unit has an iCal URL | iCal URLs on all units |
| 9 | OTA fallback to #7 | Sub-path of #8 | Gen 2 operator | **Neon** | Governed by the conflict rule | Yes | No | Compatibility only | Retire with #8 | As #8 |
| 10 | GET WP availability | Reads availability from WordPress when units SoT is off | Gen 2 UI | **WordPress** read | No — read-only | Yes | No — `buildAvailabilityFromNeon` used | Compatibility only | Remove when all tenants on units SoT | Universal units SoT |
| 11 | Guests page WP pull | Pulls WP guests and upserts profiles | Gen 2 page load | **Neon** displays; WP overwrites profile fields | **Yes — guest profile fields, no recency check** | Yes | No — refused | Compatibility only | Drop the pull once guests are fully in Contacts | Guest data migrated |
| 12 | GET WP housekeeping | Reads the HK board from WordPress when HK SoT is off | Gen 2 UI | **WordPress** read | No — read-only | Yes | No | Compatibility only | Retire with #3 | Universal HK SoT |
| 13 | GET WP summary | Only source of the accommodation summary metrics | Gen 2 UI/overview | **WordPress** read | No — read-only | Yes | **Yes — 404s, metric is broken** | **Unknown** | Build a Neon-derived summary, then drop the WP leg | New Gen 2 functionality, not detachment |
| 14 | Booking DELETE WP mirror | Neon cancels first, WordPress soft-cancel is best-effort | Gen 2 operator | **Neon** | No | Yes | Yes — Neon-only, WP leg 404s harmlessly | Required legacy connector | Keep | — |
| 15 | Unit PATCH WP mirror / pull | Neon written first, mirrored, then the WordPress-authored fields read back | Gen 2 operator | **Neon** | No — writeback narrowed in Phase 9 to `ical_export_url`, `airbnb_id`, `bookingcom_id` | Yes | Yes — Neon path only | Required legacy connector | Keep | — |

**Nothing is classified Safe to remove.** Every dependency is either ingress from
a WordPress install, or the only path for a tenant pointing at a non-apex host.
Two are Unknown and both are blocked on evidence from outside this repository
rather than on a decision available from the code.

**No booking dependency is classified Source-of-truth risk any more.** The two
that were — the booking import (#4–#9) and the unit PATCH writeback (#15) — were
closed in Phases 8 and 9. The one remaining unguarded overwrite is #11, guest
*profile* fields, which is not booking data; it is recorded here rather than
changed, because the same conflict rule would need porting to
`upsertGuestFromWpRow` and no guest-side divergence has been observed.

---

## Booking source of truth — determination

**Yes. Gen 2 / Neon is the canonical source of truth for bookings.**

Operationally that means:

- **Every booking mutation an operator can perform writes Neon first.** Create
  (Gen 2-first when units SoT is on, which is the default), PATCH, cancel/delete,
  housekeeping and unit edits all persist to Neon before WordPress is contacted,
  and a WordPress failure never rolls back or fails the Neon write. It is
  reported as `wpMirror: { ok: false }` instead.
- **All four apex brands operate with WordPress unreachable.** `refuseAccWpOnGen2Apex`
  makes outbound accommodation calls 404 for CVH, Roe, DigitalGate and Aëtherra,
  and every operator path still works because Neon is what it reads and writes.
- **WordPress cannot overwrite a newer Gen 2 booking.** An import that repeats
  WordPress's last accepted state is skipped; one that genuinely changed is
  applied only while Gen 2 has not also moved; if both moved, Neon is kept and the
  divergence is recorded and reported.
- **Overlap protection is Neon-side.** Advisory locks plus overlap checks on every
  create and date-modifying update, including imports whose unit is not yet in
  Neon, which are serialised on the WordPress unit id instead.
- **Booking identity is `externalWpId`.** The WordPress post id, matched within an
  organisation. There is no `platform_id` in the plugin to round-trip.

The remaining WordPress booking functionality is therefore correctly described as
**connector, mirror and legacy ingress** — never an equal source of truth:

| Role | Which paths |
|---|---|
| **Legacy ingress** | `dg-stay-booking` webhook (#5), and the pull/seed/OTA imports (#4, #6–#9). WordPress originates the data, Neon decides whether to accept it. |
| **Mirror** | Booking PATCH mirror, DELETE soft-cancel (#14), unit PATCH mirror (#15). Best-effort, after Neon. |
| **Legacy authority, scoped and shrinking** | Only #1 (create when the Gen 2-first flag is off or no units exist), #2 (guest PATCH, no known caller), #3 (housekeeping without HK SoT), and the read-only #10/#12/#13. Each is reachable only for a tenant that has not yet migrated, and none is reachable for the apex brands. |

The one honest qualification: WordPress remains the origin for **public
book-now** on legacy hosts, so ingress must keep working until that funnel is
Gen 2-native (WP-D-403). Being the origin of new bookings is not the same as
being authoritative over existing ones, and the conflict rule is what enforces
that distinction.

### Phase 8 update — plugin source read, questions resolved

The plugin (`dg-platform`, v10.70.0, 253 PHP files) is a separate public
repository and was read directly. Three Phase 7 unknowns are now settled.

**Every accommodation endpoint Gen 2 calls exists in the plugin.** All fourteen
routes registered by `DG_Acc_Dev_API` — summary, bookings GET/POST/PATCH/DELETE,
properties GET/PATCH, guests GET/PATCH, availability, housekeeping GET/PATCH,
ota-sync, reviews — are implemented. There are no dead HTTP dependencies, so no
item can be removed on the grounds that its remote endpoint is gone.

**`platform_id` does not exist in the plugin.** Zero occurrences across all 253
PHP files. Booking create reads a fixed field allowlist and writes a fixed meta
set, so a `platform_id` in the payload is silently discarded. PATCH resolves
identity as `(int) $row['id']` and requires the post to be a `dg_booking`; a row
without a numeric WordPress id is skipped with no error. Neither response shape
(`format_bookings` for pull, `format_booking_row` for the webhook) returns it.
So all four round-trip questions are answered **no**, and the WordPress post id
is the only booking identity that exists. Do not send `platform_id` outbound —
nothing would store it, and Gen 2 would be populating an identifier that never
comes back. The units pattern works only because units resolve inbound by
`platform_id` *when Gen 2 itself supplied the row*; the plugin does not
participate in that either.

**No timestamp is emitted anywhere.** Neither booking formatter includes a
modification time, which is why the import conflict rule cannot use one.

**Guest PATCH is not the field-mismatch risk it appeared to be.** The plugin's
`update_guests` handler accepts every field Gen 2 sends — name, email, phone,
address, source, notes, tags, vip, contact_id — and silently drops none. The
real gap is the reverse: the Neon-first `update_guest_profile` path does **not**
mirror `tags`, `address` or `source` to WordPress. So converting the WP-first
route is still blocked, but on unknown external callers plus that three-field
gap, not on the plugin.

Two plugin-side observations worth acting on outside this repository:

- `DG_Acc_Platform_Sync` **is** initialised (traced from `dg-platform.php` →
  module registry → `accommodation.php`), so the `dg-stay-booking` webhook is
  live code rather than an orphan. It no-ops when no webhook secret is
  configured.
- The webhook fires on `dg_booking_created` and `dg_booking_confirmed` only.
  `create_booking_from_data`, used by the Stripe finalize path, fires **neither**
  — so a Stripe-paid public WordPress booking may never reach Neon by webhook and
  would arrive only on the next pull sync. This is a plugin bug and needs fixing
  in `dg-platform`, not here. Traced in full in Phase 9 below.

### Stripe → WordPress → Gen 2 payment path (Phase 9)

Traced end to end across both repositories. This is a **material** gap, not a
theoretical one, and the fix is one line in the plugin.

PayID and Stripe are structurally different in the plugin. PayID inserts the
`dg_booking` post immediately as unpaid and fires `dg_booking_created`, so Gen 2
learns about it straight away. Stripe instead holds the booking in a
`dg_temp_booking_{ref}` option until payment succeeds, then creates the post in
one step via `create_booking_from_data` — already `paid=yes`,
`status=confirmed` — and that function contains no `do_action` at all. Three
handlers converge on it (the plugin's own Stripe webhook on
`payment_intent.succeeded`, the REST confirm-booking callback, and a redirect
stub that is empty), so none of them notify Gen 2.

Consequences:

- The booking does not merely have a wrong paid flag — **it is absent from Neon
  entirely**, because the create is what would have pushed it.
- It is therefore missing from the bookings table and both sides of the payments
  page, and under units SoT the calendar derives availability from Neon, so
  **those dates can appear available in Gen 2 while blocked in WordPress**. That
  is a double-booking risk, and it is the reason this matters more than a stale
  badge would.
- The pull sync does repair it, and the Phase 8 fingerprint rule does **not**
  block that repair: the row is absent, so the import takes the create path, and
  even for an existing row a paid-state change alters the fingerprint and is
  correctly applied.
- But `acc.wp_auto_sync` is **off by default**, there is no cron for accommodation
  booking pull, and page-load triggers are gated by that flag. So on a legacy
  host with the default configuration the inconsistency lasts **until an operator
  presses Sync** — indefinitely. With auto-sync on, up to about 15 minutes after
  an ops page load.
- On an **apex** connector there is no repair path at all: the webhook never
  fires because of the plugin bug, and the pull sync is refused by
  `refuseAccWpOnGen2Apex`.
- Duplicate payment processing is **not** possible. The plugin's Stripe stack and
  Gen 2's are separate: Gen 2's webhook only acts on `dg_kind: stay_booking`
  metadata, which the plugin's payment intents do not carry.
- The **Gen 2-native** public booking path is unaffected. It writes Neon first
  and finalises through Gen 2's own Stripe webhook.

### The plugin patch — reviewed and ready, cannot be pushed from here

The fix is a one-way notification in `dg-platform` (plugin v10.70.0). It has been
reviewed against the plugin source and all six preconditions are confirmed, but
this agent has **read-only** access to that repository: `git push --dry-run`
returns `403 Permission to w7tcv2m7tk-netizen/dg-platform.git denied`. So it is
recorded here rather than applied.

**File:** `modules/accommodation/includes/class-acc-payments.php`
**Function:** `create_booking_from_data`
**Placement:** immediately after the `is_wp_error` guard (currently lines 155-157),
before the `if ($email)` confirmation-email block — the earliest point at which
the booking definitively exists with its meta fully written.

```php
         if (is_wp_error($booking_id)) {
             return $booking_id;
         }
 
+        do_action('dg_booking_created', (int) $booking_id, $booking_ref);
+
         if ($email) {
             self::send_booking_confirmation([
```

One line. It is not a new pattern: the PayID path in the **same file** (line 372)
already ends with exactly `do_action('dg_booking_created', (int) $booking_id, $booking_ref);`,
and the Dev API create uses the same call. This makes the Stripe path consistent
with the two paths that already notify.

**Preconditions, all confirmed against source:**

| Requirement | Evidence |
|---|---|
| Listener exists | `class-acc-platform-sync.php:19` — `add_action('dg_booking_created', [__CLASS__, 'on_booking_created'], 40, 2)` |
| Signature matches | `on_booking_created($booking_id, $ref = '')` takes 2 args; the call passes `(int)` then the ref string. The listener ignores `$ref` and calls `push_booking((int) $booking_id)` |
| Cannot duplicate the booking | Three independent layers. (1) `create_booking_from_data` opens with a `dg_booking_ref` lookup and returns the existing id **before** any insert, so a webhook/confirm-booking race fires the hook at most once. (2) `upsertStayBookingFromWpRow` keys on `organisationId + externalWpId`, so a repeat push updates rather than inserts — and an unchanged repeat is skipped by the fingerprint rule. (3) the create path holds the unit advisory lock and refuses a genuine overlap |
| `externalWpId` stays authoritative | The webhook parser maps the WordPress post `id` and requires it to be numeric and > 0; the upsert matches on `organisationId_externalWpId`. No `platform_id` anywhere |
| Neon import/fingerprint/conflict logic is used | The webhook calls the same `upsertStayBookingFromWpRow` the pull sync uses, so it passes through `classifyWpBookingImport` and `recordImportConflict` |
| One-way only | `push_booking` is a fire-and-forget `wp_remote_post` (`'blocking' => false`) to the existing Gen 2 webhook. Gen 2 decides whether to accept; nothing writes back to WordPress on that path |

**Round-trip test, once applied:** take a Stripe booking on a non-apex WordPress
host, then confirm in order — the `dg_booking` post exists with `paid=yes`; the
Gen 2 webhook receives one request; a `StayBooking` appears in Neon with
`externalWpId` set to the WordPress post id and `paid: "yes"` in metadata; the
dates now show as occupied on the Gen 2 calendar; and re-firing the same event
returns `skipped` rather than creating a second row. Apex hosts are unaffected
either way — the webhook has no apex gate, so it works, while the pull sync that
previously could not repair this remains refused.

No change is required in this repository. Neon stays authoritative because that
webhook path runs the same import rules as every other WordPress row, including
the divergence check.

### `platform_id` round-trip — resolved: the plugin has no such field

Bookings do **not** follow the units identity pattern:

- units resolve inbound rows by `platform_id` first and fall back to the WP id
  (`upsertAccommodationUnitFromWpRow`), and Gen 2 puts `platform_id` on outbound
  unit shapes and PATCH payloads;
- bookings declare `platform_id` on `WpAccBookingRow` but
  `upsertStayBookingFromWpRow` never reads it, the `dg-stay-booking` webhook
  parser does not map it, and the Gen 2-first create does not send it — it links
  the WP id back afterwards via `linkStayBookingExternalWpId`.

Confirmed in Phase 8 by reading the plugin: it has no `platform_id` field, so
the round-trip does not exist and cannot be made to exist from this side.
Booking identity is the WordPress post id, matched in Neon via `externalWpId`.

### Stale WordPress data can no longer overwrite newer Gen 2 edits

Resolved in Phase 8. `upsertStayBookingFromWpRow` records a fingerprint of the
WordPress row it last accepted, in the existing `metadata` JSON. An incoming row
identical to that fingerprint is skipped, because WordPress has not changed and
the row therefore cannot be newer than whatever Gen 2 has done since. A row that
differs is applied, because that change originated in WordPress and legacy
tenants still depend on it.

This is deliberately not a timestamp comparison: the plugin emits no
modification time, so there is nothing to compare. It is not `platform_id`
either, which does not exist, nor `gen2_origin`, which is written once and then
erased by the first import because `mapBookingFields` rebuilds `metadata`.

Rows imported before the rule have nothing recorded, so they behave as before
and arm themselves on the next sync — a one-cycle gap accepted in preference to
a migration and a backfill.

---

## Related docs

- [ROADMAP.md](./ROADMAP.md) — execution roadmap (points here for detach)
- [CONNECTOR-SPECIFICATION.md](./connectors/CONNECTOR-SPECIFICATION.md)
- [DEPLOY-WP-PLUGIN.md](./DEPLOY-WP-PLUGIN.md)
- [PLATFORM-API.md](./PLATFORM-API.md)
- In-app progress: `packages/platform-core/src/roadmap/index.ts` (`detach.*` items)
