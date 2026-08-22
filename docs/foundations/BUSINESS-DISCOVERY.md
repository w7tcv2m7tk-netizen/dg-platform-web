# Business Discovery Engine

**Core Platform capability — Command Centre primary consumer**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** V1 search + selective import shipped (Places + ABN providers env-gated)  
**Parent:** [GROWTH-ENGINE.md](../GROWTH-ENGINE.md) · [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) · Command Centre `/command/growth-engine/discovery`

**Downstream:** After import + audit, [Opportunity Engine](./OPPORTUNITY-ENGINE.md) ranks who to speak to today.

---

## What it is

A **Business Intelligence + Prospecting Engine** for DigitalGate staff:

1. Choose industry + location (+ radius / type filters)  
2. Search licensed / registered **business-data providers**  
3. Select candidates (not auto-dump)  
4. Import → `GrowthProspect` with `providerRefs`  
5. Enrich / audit → Opportunity report → pipeline → convert  

**Not** a Real Estate-only feature. Industry packs tune queries and audit focus; the engine is universal.

**Tenant product:** Packaged as **Prospecting & Opportunity Engine** Growth App (`/apps/prospecting`, `$99/mo`) — one App including Discovery, scoring, pipeline and CRM handoff.

**Staff GTM:** Command Centre `/command/growth-engine` remains DigitalGate’s operating surface for Founding 10 / network prospecting.

**Not** CRM Companies on import — only Growth prospects until explicit promote / client transition.

**Not** tenant **Business Setup / Start Your Business** — that Core **Business Services** product surface (name → ABR verify → registration handoff → Business Profile → presence) is [BUSINESS-SETUP.md](./BUSINESS-SETUP.md). Discovery may share the ABR GUID / adapter; product surfaces stay separate.

---

## Architecture

```
Business Discovery UI
        ↓
Data Provider Layer
   ├── Google Places (Text Search New)
   ├── ABN Lookup (ABR web services)
   ├── (future) licensed AU providers
   ├── Website discovery / enrichment
   └── Manual add
        ↓
Ephemeral candidates (UI only)
        ↓
Selective import → GrowthProspect + providerRefs
        ↓
Presence audit / industry pack focus
        ↓
Opportunity report → Prospect pipeline → CRM/org on convert
```

### Storage / compliance

| Source | Persist |
|--------|---------|
| Google Places search results | **Ephemeral** in API response. On import: **place_id** (+ user-selected name / phone / website / address). Do **not** cache full Places payloads as a local business directory. |
| ABN Lookup | On import: **ABN** + entity name / state / postcode as verification refs. |
| Website probe | Own enrichment on prospect / audit findings. |

Customer UX never names “Google” or “ABR” as the product — DigitalGate Business Discovery.

---

## Provider interface

```ts
interface BusinessDataProvider {
  id: "google_places" | "abn_lookup" | …;
  isConfigured(): boolean;
  search(ctx): Promise<DiscoveryCandidate[]>;
}
```

Env:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Preferred Places key (Places API New) |
| `GOOGLE_GEOCODING_API_KEY` | Fallback if Places enabled on same key; also used for radius geocode |
| `ABN_LOOKUP_GUID` / `ABR_GUID` / `ABR_AUTHENTICATION_GUID` | ABR authentication GUID (**server-only secret** — never `NEXT_PUBLIC_*` or client) |

---

## Industry packs

| Pack | Example search focus | Audit emphasis |
|------|----------------------|----------------|
| Real Estate | agencies, buyers agents | vendor acquisition, listings, AI visibility |
| Finance | mortgage / finance brokers | lead gen, SEO |
| Trades | plumbers, builders | local search, calls, quotes |
| Professional | accountants, solicitors | authority, conversion |
| Accommodation | stays, motels | direct bookings, reviews |
| Automotive | dealers, mechanics | inventory, enquiries |
| General | fallback | website, visibility, reputation |

---

## Score dimensions (audit / report)

Composite **DigitalGate Business Score** (prospect edition) breaks down toward:

Visibility · Website · SEO · AI Visibility · Conversion · Reputation · Technology  

V1 presence audit maps reachable HTML signals into website / SEO / AI / health scores; fuller breakdown continues on the Growth audit track.

---

## APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/v1/command/growth/discovery/search` | Provider status |
| POST | `/api/v1/command/growth/discovery/search` | Search candidates |
| POST | `/api/v1/command/growth/discovery/import` | Select-import → prospects |

---

## Explicit non-goals

- Scraping Google SERP / Maps HTML  
- Auto-importing all search hits into CRM  
- Tenant-facing Discovery product (V1)  
- Autonomous AI SDR / cold spray  
- Real-estate-only schema  

---

## Related

- [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)  
- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md)  
- [COMMAND-CENTRE-BETA.md](../COMMAND-CENTRE-BETA.md)  
- Code: `packages/platform-core/src/business-discovery/`
