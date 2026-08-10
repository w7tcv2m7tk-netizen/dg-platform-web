# Connector Engine

**Status:** Architecture accepted · WordPress + Stripe live · Domain OAuth + Google GBP scaffold · Framework booted  
**Layer:** **Platform Core** (not an industry app)  
**Positioning:** “Gateway to Your Digital World” — connectors feed Universal Objects → AI + scoring → Insights / Automation / Actions.

**Do not** ship one-off “REA integration / Domain integration / Google integration” as disconnected features. Ship **connectors** that plug into this engine.

Supersedes the narrow sketch in [../connectors/CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md) (that file now points here).

---

## Architecture

```
                  DIGITALGATE
                       │
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
        │              │              │
        └──────────────┼──────────────┘
                       │
                UNIVERSAL DATA
                       │
                AI + SCORING
                       │
           ┌───────────┼───────────┐
           │           │           │
       Insights    Automation   Actions
```

| Category | Purpose | Examples |
|----------|---------|----------|
| **Property** | Listings, valuations, agency PMS | REA, Domain, CoreLogic, PropTrack, PriceFinder, VaultRE, Rex, … |
| **Business** | Discovery, identity, local presence | GBP, ABR, registries, maps, reviews, directories |
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

## Business Data (Discovery + Twin)

Feeds [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) and Opportunity Engine:

Google Business Profile · ABR / ABN · company registries · maps · social · reviews · industry directories · tech stack signals.

Profile shape:

`Business → Website → Social → Reviews → Search → AI visibility → Ads → Stack → Opportunities`

AI output: “These are the 10 businesses DigitalGate should contact today.”

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

## Implementation priority (Core order)

| # | Connector | Why now |
|---|-----------|---------|
| 1 | **Stripe** | Billing & subscriptions |
| 2 | **Google** | GBP + Analytics + Search Console + Ads |
| 3 | **WordPress** | Production connector (live) |
| 4 | **REA** | AU residential listing syndication |
| 5 | **Domain** | AU listing syndication (sandbox → prod) |
| 6 | **Meta** | Facebook / Instagram + Lead Ads |
| 7 | **Email / SMS** | Communications infrastructure |
| 8 | **Xero** | Accounting / invoices |
| 9 | **Shopify** | Commerce |
| 10 | **Property intelligence** | CoreLogic / PropTrack / PriceFinder (subject to access) |

REA and Domain are the **start of the connector ecosystem**, not its centre.

Accommodation OTAs follow the same engine via [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md).

---

## Related

- [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md) — Listing Hub + Domain MVP  
- [ACC-CHANNEL-CONNECTIVITY.md](./ACC-CHANNEL-CONNECTIVITY.md) — OTA adapters  
- [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) · [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md)  
- [OBSERVABILITY.md](./OBSERVABILITY.md) — connector health  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs on manifests  
- Live code today: `connectors/wordpress/`, `commerce/connectors/stripe/`
