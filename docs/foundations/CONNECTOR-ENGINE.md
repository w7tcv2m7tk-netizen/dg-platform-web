# Connector Engine

**Status:** Architecture accepted · WordPress + Stripe live · Domain OAuth + Google GBP OAuth/locations sync · Cotality sandbox (OAuth + Address Match) · Framework booted  
**Layer:** **Platform Core** (not an industry app)  
**Positioning:** “Gateway to Your Digital World” — connectors feed Universal Objects → AI + scoring → Insights / Automation / Actions.

**Do not** ship one-off “REA integration / Domain integration / Google integration” as disconnected features. Ship **connectors** that plug into this engine.

### Customer vs operator naming (lock)

| Audience | Label | UX |
|----------|-------|-----|
| **Customer** | **Connected Services** | Settings → Connected Services — human cards (Google Workspace · Microsoft 365 · Stripe · REA · Domain · WordPress…). Connect / Connected · last sync. No OAuth / api_key / client_credentials jargon. |
| **DigitalGate operator** | **Connector Engine** | Command / internal Settings — scopes, probes, auth kinds, platform-ready, credentials, health. |

Google Workspace and Microsoft 365 are **first-class Connected Services** (mail · calendar · contacts over time). Provider mechanics stay invisible; Universal Objects are the abstraction (Outlook email → Communication, Gmail contact → Contact, calendar → Consultation/Task).

**Priority stack (tiers, DigitalGate 15, immediate programme):** [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) — read that before adding integrations.

Supersedes the narrow sketch in [../connectors/CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md) (that file now points here).

---

## Architecture

APIs are not the product — DigitalGate is the intelligent layer:

```
DIGITALGATE
    │
PLATFORM CORE
    │
CONNECTOR LAYER
    ├── Business   (identity, registries, presence, infra)
    ├── Growth     (ads, social, reviews, communications, AI providers)
    └── Industry   (RE portals, property intelligence, vertical PMS/OTAs)
    │
UNIVERSAL OBJECTS
    │
AI SERVICE  (Model Router → providers)
    │
SCORING → AUTOMATION → COMMAND CENTRE → BUSINESS INTELLIGENCE
```

Connector Engine categories (how adapters group in code / Settings):

```
                  CONNECTOR ENGINE
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    PROPERTY        BUSINESS       MARKETING
        │              │              │
    REA              Google        Google Ads
    Domain           ABR           Meta
    CoreLogic        Directories   Social
    PropTrack        Maps          Email
    PriceFinder      Reviews       SMS
    Agency PMS       …             …
```

| Category | Purpose | Examples |
|----------|---------|----------|
| **Property** | Listings, valuations, agency PMS | REA, Domain, CoreLogic, PropTrack, PriceFinder, VaultRE, Rex, … |
| **Business** | Discovery, Business Services (Setup), identity, AU registries, local presence | GBP, ABR (verify/enrich), ASIC (names/companies when DSP approved), maps, reviews, directories |
| **Marketing** | Ads, social, messaging | Google Ads, Meta, Email, SMS |
| **Commerce / ops** | Money & site | Stripe, Xero, Shopify, WordPress |

Industry apps (RE Listing Hub, Acc OTA channels) **consume** connectors — they do not own auth/sync infrastructure.

---

## Connector Framework (every connector)

| Concern | Requirement |
|---------|-------------|
| Authentication | API key, OAuth, webhook signature |
| Credentials | Per-org encrypted storage |
| Connection status | Connected / degraded / error / disconnected |
| Sync configuration | Objects, direction, schedule |
| Data mapping | External → Universal Objects (+ app extensions) |
| Webhooks | Inbound events preferred over polling |
| Sync logs | Last sync, counts, errors |
| Error handling | Retry + dead-letter at scale |
| Rate limits | Per-provider backoff |
| Permissions | Org roles + connector scopes |
| Disconnect / reconnect | First-class UX |
| Manual sync | Staff / client trigger |
| Data ownership | Documented SoT rules |

**Adding a new integration =** build connector → map data → register events → expose capabilities — not rebuild the platform.

### Manifest (target)

```typescript
interface ConnectorManifest {
  id: string;                    // e.g. "domain", "rea", "google-gbp"
  name: string;
  category: "property" | "business" | "marketing" | "commerce" | "ops";
  auth: "oauth" | "api_key" | "webhook" | "mixed";
  syncObjects: string[];         // Universal Object ids
  capabilities: string[];        // e.g. "listing.publish", "lead.ingest"
  webhookEvents?: string[];
  oauthScopes?: string[];
  countries?: string[];          // Country Pack awareness
  appIds?: string[];             // Which apps surface this connector
  /** Strategic priority tier 1–10 — see CONNECTOR-PRIORITY.md (not “enabled”) */
  priorityTier?: number;
  /** Rank in DigitalGate 15 (1–15), if applicable */
  dg15Rank?: number;
}
```

Scaffold: `packages/platform-core/src/connectors/framework/`

---

## DigitalGate Listing Hub (RE App)

Agent creates a property **once** in DigitalGate. Listing Engine is SoT for campaign content; portals are sinks.

```
PROPERTY
   ├── Photos, description, features, price
   ├── Inspection times, agent, documents
   └── …
          │
          ▼
   DIGITALGATE LISTING ENGINE
          │
          ├── REA
          ├── Domain
          ├── Website
          ├── Facebook / Instagram
          ├── Google
          └── Future portals
```

Detail: [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md).

---

## Real Estate — connector tiers

> Naming: these are **RE capability tiers** (critical portals → intelligence → PMS).  
> Platform-wide build order is [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) (Tier 1–10 / DigitalGate 15).

### Tier 1 — Critical

| Connector | Capabilities |
|-----------|----------------|
| **realestate.com.au (REA)** | Listing syndication + updates, enquiries/leads, agent/property data, performance (where available) |
| **Domain** | Listing create/update, property data, enquiries, listing performance (portal access in progress) |
| **Google Business Profile** | Profile, reviews, posts, insights, locations — **platform-wide**, not RE-only |

### Tier 2 — Property intelligence (commercial / API access TBD)

| Connector | Value |
|-----------|--------|
| **PropTrack** | Valuations, market data, ownership/history (licensed), vendor prospecting + AI |
| **CoreLogic Australia** | Market analytics, valuations, ownership, comps |
| **PriceFinder** | Sales history, comps, prospecting |

Investigate licensing before building.

### Tier 3 — Agency ecosystem (PMS)

DigitalGate as the layer between agency tools and portals/marketing:

`Agency → DigitalGate → REA / Domain / CRM / Website / Google / Marketing / AI`

Assess APIs individually: **MRI / VaultRE**, **Rex**, **LockedOn**, **Agentbox**, …

---

## Business Data (Discovery + Twin + Business Services)

Feeds [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md), [BUSINESS-SETUP.md](./BUSINESS-SETUP.md) (**Business Services** / Start Your Business), and Opportunity Engine:

Google Business Profile · **ABR** (ABN verify / entity enrichment — **not** registration) · **ASIC** (Business Names & Companies Register APIs for DSPs — **pending application / test env**; no scrape; no production submit yet) · Dreamscape (domains/hosting via Infrastructure) · maps · social · reviews · directories.

| Connector | Category | Honest status | Role under Business Services |
|-----------|----------|---------------|------------------------------|
| **ABR** (`abr`) | business | **Live** (GUID-gated) — SearchByABNv202001 / SearchByASICv201408 | Verify ABN/ACN, enrich entity for Setup + Discovery |
| **ASIC** (`asic`) | business | Stub — `pending_provider_approval` | AU names/companies registration after DSP approval + test pass |
| **Google GBP** | business | OAuth + locations sync · reviews best-effort | Digital Identity + Reputation |
| **Dreamscape** | ops / infra | Sandbox-first reseller | Domains / hosting / SSL / mailbox (Infrastructure) |

Profile shape:

`Business → Website → Social → Reviews → Search → AI visibility → Ads → Stack → Opportunities`

AI output (Discovery): “These are the 10 businesses DigitalGate should contact today.”  
**Business Setup** (separate tenant surface): Start Your Business → Profile → Website/Email/CRM → Grow.

---

## Prospecting bridge (Command Centre)

Property intelligence + Listing Hub + Discovery:

```
Today’s Opportunities
123 Smith St, Currumbin
  · Selling-window signals · Last sold 8y · Est. $1.4m
  · Market activity ↑ · Agency coverage low · Visibility opportunity high
  · Vendor opportunity score 92/100
→ Contact today · Generate report · Prospect · Pipeline · Email · Call · Follow-up
```

Connectors supply facts; Opportunity Engine scores; Growth Engine / Command Centre acts.

---

## Implementation priority

**Canonical:** [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) — Tier 1–10 framing, **DigitalGate 15**, immediate programme (ABR, ASIC, Dreamscape, Google, Stripe, REA, Domain, RP Data), and anti-priorities.

REA and Domain are the **start of the RE connector ecosystem**, not the centre of DigitalGate.

Accommodation OTAs follow the same engine via [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md).

---

## Related

- [CONNECTOR-PRIORITY.md](./CONNECTOR-PRIORITY.md) — **priority stack / DG15**  
- [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md) — Listing Hub + Domain MVP  
- [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md) — OTA adapters  
- [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) · [BUSINESS-SETUP.md](./BUSINESS-SETUP.md) (Business Services) · [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md)  
- [OBSERVABILITY.md](./OBSERVABILITY.md) — connector health  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs on manifests  
- Live code today: `connectors/wordpress/`, `commerce/connectors/stripe/`, `connectors/abr/` · Google GBP OAuth + locations sync · scaffolds: Domain, Cotality · stubs: `connectors/asic/`
