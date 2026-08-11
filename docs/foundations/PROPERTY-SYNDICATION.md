# Property Syndication Engine

**Status:** Architecture accepted · Domain OAuth + publish MVP · **REA connector scaffold (fail closed)**  
**App:** Real Estate (capability of RE App — **not** platform-wide RE-only design)  
**Parent:** [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md) — Property & Listing Syndication is a **capability** of the Connector Engine, not a one-off portal integration.  
**Goal:** DigitalGate Listing Hub is SoT — create once, syndicate to REA / Domain / Website / social / future portals.

Parallel pattern: Accommodation OTA channels — [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md).

---

## What this is (and isn’t)

| Call it | Not |
|---------|-----|
| **Property Syndication Engine** / **Listing Hub** inside the Real Estate App | “We integrate with Domain” as the product story |
| Portal adapters (Domain, REA, …) behind one Listing dashboard | Hard-wiring Domain shapes into Property |
| Consumer of Core **Connector Framework** | Separate auth/sync stack per portal |

Universal platform stays industry-agnostic: syndication is an **RE App capability**. Other verticals get their own engines later (vehicles → automotive marketplaces, products → commerce channels, accommodation → OTAs).

**RE connector capability tiers** (REA · Domain · GBP · PropTrack · CoreLogic · PriceFinder · agency PMS) are in [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md). **Platform build order / DigitalGate 15:** [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md). This doc is the Domain MVP + Listing Hub detail. **REA scaffold:** [../connectors/REA.md](../connectors/REA.md).

---

## Domain OAuth (platform)

| Env | Purpose |
|-----|---------|
| `DOMAIN_CLIENT_ID` | OAuth client id from Domain Developer Portal |
| `DOMAIN_CLIENT_SECRET` | Client secret — **Vercel only, never commit** |
| `DOMAIN_REDIRECT_URI` | Default `https://app.digitalgate.com.au/api/connectors/domain/callback` |
| `DOMAIN_API_PATH_PREFIX` | Set `/sandbox` for Listing Management Sandbox; omit for Primary |
| `DOMAIN_OAUTH_SCOPES` | Client-credentials scopes only (optional; Listing Mgmt clients usually skip CC) |
| `DOMAIN_AUTH_CODE_SCOPES` | Auth-code scopes (agency user context; include `offline_access` + listing write scopes) |

Routes:

- `GET /api/connectors/domain/connect` — start Authorization Code flow  
- `GET /api/connectors/domain/callback` — exchange code → store tokens on org  
- `GET /api/v1/connectors/domain/status` — configured? + probes + preferred agency  
- `POST /api/v1/properties/[id]/syndicate/domain` — residential listing upsert (publish MVP)  

Settings → Connectors shows the Domain card. Property detail → **Domain syndication** panel has Publish.

**Probe behaviour**

| Probe | Meaning |
|-------|---------|
| Client-credentials | Optional. Listing Management OAuth clients are **Authorization Code** — `unauthorized_client` is **N/A**, not a failure. |
| Org API | Uses `GET /v1/me` then `GET /v1/me/agencies` (Listings Management). Does **not** use Agents & Listings `GET /v1/agencies`. |
| Security header | Failures surface `X-Domain-Security-Reason` when Domain sends it (missing scope · wrong package · sandbox vs Primary). |

Client URL / logo on the Domain project (marketing only): `https://app.digitalgate.com.au` · DigitalGate banner/logo assets.

---

## Domain Developer Portal — do now

### Credential + package checklist (Ben)

1. **Credential grant type** = `Authorization Code` (correct for agency connect). Do **not** expect client_credentials on this client.
2. **Redirect URI** exact match: `https://app.digitalgate.com.au/api/connectors/domain/callback` (portal updates can take ~10 minutes).
3. **API Access → Add to project**: **Listings Management — Sandbox** (required for `/sandbox/v1/…` and `_testAgency`).
4. If probing / publishing sandbox APIs from DigitalGate, set Vercel `DOMAIN_API_PATH_PREFIX=/sandbox`.
5. **Scopes on the OAuth client / consent**: at least  
   `openid offline_access api_listings_read api_listings_write api_agencies_read api_agencies_write`  
   (reconnect org after changing scopes).
6. Confirm **API Access** includes Listings Management — **not** only Agents & Listings. A 403 on `/v1/agencies` with Token OK usually means wrong product package; use `/v1/me` instead.
7. For a 403 that still appears on `/v1/me` **without** `/sandbox`: you are on **Primary**. Either set `DOMAIN_API_PATH_PREFIX=/sandbox` (Sandbox package) or obtain **Listings Management — Production**. Check `X-Domain-Security-Reason` when present.
8. Email **api@domain.com.au** to activate Listings Management on the developer org if the package is missing; later request **Listings Management — Production** + principal-agent approval per live agency.

### Add to project

| Product | Action |
|---------|--------|
| **Listings Management — Sandbox** | ✅ **Add to project** (build + test against sandbox) |

### Request access

| Product | Why |
|---------|-----|
| **Listings Management — Production** | Critical production approval for live agencies |
| **Address Suggestions** | Type-ahead address → populate Property on create |
| **Webhooks** | Domain → DigitalGate status (accepted / rejected / errors) — no polling |
| **Agents & Listings** | Agents, listings, relationships, agency activity — **not** MVP-blocking (do not use `/v1/agencies` as the health probe) |

### Leave for later

Properties & Locations · Property Enrichment · Property Package · PropertyRadar · Rental AVM · Schools · Price Estimation

Do not overcomplicate the first integration.

---

## Publish MVP (what ships now)

**SoT:** DigitalGate `Property` (Listing table later). `providerAdId` = `dg-{propertyId}`.

**API path:** `PUT {DOMAIN_API_PATH_PREFIX}/v1/listings/residential` with org Bearer token.

**Agency resolution order:**

1. Stored org `domainAgencyId` (from prior probe/publish)  
2. `GET /v1/me/agencies` first agency  
3. Sandbox only (`DOMAIN_API_PATH_PREFIX` contains `sandbox`): `POST /v1/agencies/_testAgency`  

**Honest success:** Domain returns a **queued** processing job (`processStatus`, job `id`). That is **not** “live on Domain.com.au”. Placement is stored on `property.externalRefs.domain` as `pending` until webhooks/report polling say otherwise.

**UI:** `/apps/re/properties/[id]` → Domain syndication → **Publish to Domain**.

### Smoke steps (Ben)

1. Vercel / `.env.local`: `DOMAIN_CLIENT_ID`, `DOMAIN_CLIENT_SECRET`, `DOMAIN_API_PATH_PREFIX=/sandbox`, redirect URI as above.  
2. Developer Portal: Listings Management — **Sandbox** on the project; scopes include listing + agency write.  
3. App → **Settings → Connectors → Domain → Connect Domain account** (Authorization Code).  
4. Refresh status: org probe should hit `/sandbox/v1/me` (and ideally `/sandbox/v1/me/agencies`). Client-credentials may show **N/A** — expected.  
5. Open a Property with suburb/state/postcode + marketing headline/description if possible. Ensure your user has an email (membership) for the Domain contact.  
6. Click **Publish to Domain**. Expect either:  
   - **Queued** message + job id on the panel, or  
   - Actionable error with HTTP detail and optional `X-Domain-Security-Reason` (do not treat as success).  
7. Optional: Domain processing report via `GET /sandbox/v1/listings/processingReports/{id}` (or wait for Webhooks when approved).  
8. Sandbox data wipes **Sunday night** — re-create test agency / re-publish after wipe.

### If OAuth / portal still red

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Connect fails / redirect mismatch | Portal redirect URI lag or typo | Wait ~10 min; exact URI match |
| OAuth token valid · `/v1/me` 403 (no `/sandbox`) | Hitting **Primary** while project only has **Listings Management — Sandbox** | Set Vercel `DOMAIN_API_PATH_PREFIX=/sandbox`, redeploy, **Reconnect**. Primary needs Listings Management — Production + `api@domain.com.au` |
| OAuth token valid · `/sandbox/v1/me` 403 | Missing Sandbox package and/or consent scopes | API Access → Listings Management — Sandbox; scopes `openid offline_access api_listings_* api_agencies_*`; reconnect |
| Probe used `/v1/agencies` historically | Agents & Listings product | Already fixed to `/v1/me` — refresh deploy |
| Publish 403 Missing Required Scope | Consent without `api_listings_write` | Reconnect after portal scope update |
| No agencies + not sandbox | Production without agency auth | api@domain.com.au + principal approval; or use sandbox prefix |
| `_testAgency` fails | Not on sandbox prefix / missing `api_agencies_write` | Set `/sandbox`; reconnect |

---

## Object model — Property vs Listing

```
Property                    ← underlying asset (address, beds, land…)
   │
   └── Listing              ← agency marketing / sale campaign (first-class)
         │
         ├── Domain Listing (portal placement + external ID + status)
         ├── REA Listing
         ├── Other portal placements
         └── Website Listing (WordPress / Gen 2 site)
```

| Object | Role |
|--------|------|
| **Property** | The asset — already in Core Object Spec + Prisma |
| **Listing** | The campaign for that asset (price, copy, media set, agency, status) |
| **ListingPlacement** | One portal (or website) channel for that Listing |

Do **not** treat “listed” as only a Property status long-term — Property can have multiple Listings over time; each Listing has many placements.

**MVP shortcut:** Property carries `externalRefs.domain` placement until `Listing` / `ListingPlacement` tables land.

See Core Object Spec § Listing (added with this design).

---

## Architecture

```
                  DIGITALGATE
                       │
               Real Estate App
                       │
              Property / Listing
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Domain         REA        Other Portals
          │            │            │
          ↓            ↓            ↓
       Status        Status       Status
          └────────────┼────────────┘
                       ↓
               Listing Dashboard
              (Syndication panel)
```

### Syndication panel (per Listing)

| Channel | Example UI |
|---------|------------|
| Domain | 🟢 Published · Last synced 10:42am |
| REA | 🟡 Scaffold / awaiting partner access (Connect & Publish disabled) |
| Portal X | 🔴 Error — missing suburb |
| Website | 🟢 Live |

Agent manages all channels from DigitalGate — not portal extranets.

### Channel adapter contract

```
SyndicationChannel
├── domain
├── rea
├── website
└── …

Ops:
  validateListing()
  publishListing()
  updateListing()
  withdrawListing()
  getStatus()
  // inbound:
  handleWebhook()
```

Domain Stage 1 = Domain adapter over Listings Management API.  
REA Stage 0 = connector + syndication adapter + status UI scaffold — **fail closed** until partner OAuth + upsert smoke ([REA.md](../connectors/REA.md)).

---

## Domain MVP workflow

```
DigitalGate Property → DigitalGate Listing
        → Domain Listings Management API → Domain
```

1. Connect Domain (sandbox credentials / agency link)  
2. Create Property (Address Suggestions when approved)  
3. Create Listing  
4. Validate listing  
5. Publish listing  
6. Update listing  
7. Withdraw listing  
8. Receive status (webhook when available; poll only as interim)  
9. Receive errors → surface to agent  
10. Store Domain listing ID on placement `externalRefs`  
11. Display syndication status in DigitalGate  

**First objective only:** Create → Publish → Update → Withdraw → Track status.  
**Shipped in this MVP:** Create/Update upsert (queued) + placement status on Property. Withdraw + webhook status still open.

Agents & Listings API informs future CRM enrichment — **not** a dependency for publishing MVP.

---

## Webhooks (why they matter)

Without webhooks DigitalGate polls: “Has this listing changed?”

With webhooks:

```
Listing submitted → Domain → accepted → webhook → DigitalGate → Published ✓
Listing rejected  → Domain → webhook → DigitalGate → Error + reason → agent sees why
```

Request **Webhooks** access with Listings Management Production.

---

## Address Suggestions

On Property create:

Start typing address → Domain suggestions → select → DigitalGate populates Property fields.

Request access now; wire when sandbox Listings Management is stable (can ship Property create without it).

---

## Implementation sketch (Gen 2)

```
packages/platform-core/src/connectors/domain/
  auth.ts              # OAuth + probes + domainApiGet/Put/Post
  listings.ts          # residential upsert + test agency
  publish-property.ts  # Property → Domain publish

packages/platform-core/src/connectors/rea/
  auth.ts              # Config + token storage + probes (OAuth TBD)
  publish-property.ts  # Fail-closed publish scaffold

packages/platform-core/src/real-estate/syndication/
  types.ts
  domain-adapter.ts    # SyndicationChannelAdapter
  rea-adapter.ts       # SyndicationChannelAdapter (scaffold)
  index.ts

src/app/api/v1/properties/[id]/syndicate/domain/route.ts
src/app/api/v1/properties/[id]/syndicate/rea/route.ts
src/components/re/DomainSyndicationPanel.tsx
src/components/re/ReaSyndicationPanel.tsx
```

Prisma (when implementing — ADR if post–Platform 1.0 field freeze):

- `Listing` (organisationId, propertyId, status, price, copy refs, …)  
- `ListingPlacement` (listingId, channel, externalId, status, lastSyncedAt, lastError, metadata)

UI: `/apps/re/properties/[id]` → **Domain syndication** + **REA syndication** (Listing detail later).

Flags (suggested): `re.syndication_domain_sandbox`, `re.syndication_domain_prod`, `re.syndication_rea` (off until partner smoke).

---

## Universal pattern (other verticals)

| Vertical | Hub object | Channel engine |
|----------|------------|----------------|
| Real Estate | Property / Listing | Property Syndication (Domain, REA, …) |
| Accommodation | Unit / Stay | OTA channels (iCal → Booking.com / Airbnb APIs) |
| Automotive | Vehicle | Marketplace syndication |
| Commerce | Product | Sales channel connectors |

Same idea: **platform core objects + app-owned channel adapters**.

---

## Related

- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — Property · Listing  
- [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md) — OTA parallel  
- [RE-BETA-LAUNCH.md](../RE-BETA-LAUNCH.md) — agency beta  
- Code: `packages/platform-core/src/connectors/domain/` · `packages/platform-core/src/connectors/rea/` · `packages/platform-core/src/real-estate/syndication/`
- REA scaffold: [../connectors/REA.md](../connectors/REA.md)
