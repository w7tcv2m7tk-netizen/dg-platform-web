# Property Syndication Engine

**Status:** Architecture accepted · Domain Stage 0 (portal access) · MVP not built  
**App:** Real Estate (capability of RE App — **not** platform-wide RE-only design)  
**Goal:** DigitalGate is the hub for **create → publish → update → withdraw → track status** across AU portals.

Parallel pattern: Accommodation OTA channels — [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md).

---

## What this is (and isn’t)

| Call it | Not |
|---------|-----|
| **Property Syndication Engine** inside the Real Estate App | “The Domain Integration” as a one-off silo |
| Portal adapters (Domain, REA, …) behind one Listing dashboard | Hard-wiring Domain shapes into Property |

Universal platform stays industry-agnostic: syndication is an **RE App capability**. Other verticals get their own engines later (vehicles → automotive marketplaces, products → commerce channels, accommodation → OTAs).

---

## Domain Developer Portal — do now

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
| **Agents & Listings** | Agents, listings, relationships, agency activity — **not** MVP-blocking |

### Leave for later

Properties & Locations · Property Enrichment · Property Package · PropertyRadar · Rental AVM · Schools · Price Estimation

Do not overcomplicate the first integration.

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
| REA | 🟡 Pending |
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

Domain Stage 1 = Domain adapter over Listings Management API. REA/other = later adapters; UI unchanged.

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
packages/platform-core/src/real-estate/syndication/
  types.ts           # ListingPlacementStatus, SyndicationChannelId
  registry.ts
  domain/
    client.ts        # Listings Management sandbox/prod HTTP
    adapter.ts
    webhooks.ts
  # later: rea/, website/
```

Prisma (when implementing — ADR if post–Platform 1.0 field freeze):

- `Listing` (organisationId, propertyId, status, price, copy refs, …)  
- `ListingPlacement` (listingId, channel, externalId, status, lastSyncedAt, lastError, metadata)

UI: `/apps/re/listings/[id]` → **Syndication** panel.

Flags (suggested): `re.syndication_domain_sandbox`, `re.syndication_domain_prod`.

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
- Scaffold: `packages/platform-core/src/real-estate/syndication/`
