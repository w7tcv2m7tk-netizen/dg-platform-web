# Industry Intelligence

**Status:** Architecture locked · Phase 0 (docs) · August 2026  
**Classification:** **Core capability** — not a standalone top-level App initially; not “News”  
**Related:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) (§12) · [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) · [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) · [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) · [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) · [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · [PRODUCT-VISION.md](../PRODUCT-VISION.md) · [ROADMAP.md](../ROADMAP.md)

---

## Positioning

Not a news aggregator. Not a crawl-everything product.

> **What happened in your industry → why it matters for *this* business → what to do next.**

Industry Intelligence is the Core feed that turns external industry signal into attributed briefings and (later) Opportunity Engine™ / Command Centre actions. It aligns with **Understand → Automate → Grow** and the morning-briefing habit on the Business Dashboard.

**Distinctive claim:** not just what happened — **why it matters + what to do**.

---

## Architecture lock

| Decision | Lock |
|----------|------|
| **Name** | **Industry Intelligence** (never ship as “News”) |
| **Placement** | **Core capability** — platform-wide consumer; Industry Apps define **feed profiles** |
| **Packaging (V1)** | Docs + roadmap item; no standalone App chrome until a thin briefing surface earns it |
| **Pipeline** | Collect → Filter → Understand → Personalise → Act |
| **Copyright** | Summarise / analyse / attribute — **do not reproduce full articles** |
| **Honesty** | No fake competitor scores, citation ranks, or invented source authority |

### What it is *not*

| Confused with | Difference |
|---------------|------------|
| **DigitalGate Intelligence** | Anonymised *network* cohort benchmarks from tenant signals — [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) |
| **BI Engine / daily briefing** (`platform-core/intelligence`) | Internal Twin + scores → “focus today” — complementary, not a feed crawler |
| **Opportunity Engine™** | Detects/scores platform Opportunities — Industry Intelligence is an **upstream signal source** |
| **Growth Apps (SEO, AI Visibility)** | Measure *your* presence; Industry Intelligence watches the *market* |

---

## Placement in the OS

```
DigitalGate Platform Core
├── Universal Objects · Event Bus · AI Service · Scoring · Automation · …
├── Opportunity Engine™
├── Industry Intelligence     ← CORE (this doc)
│     ├── Feed profiles (per Industry App)
│     ├── Collect → Filter → Understand → Personalise → Act
│     └── Briefing cards (attributed sources)
└── Apps (RE, Acc, Finance, Services, …)  ← define / refine feed profiles

Consumers (platform-wide):
  AI Service · Universal Search · Reporting · Notifications ·
  Opportunity Engine™ · Command Centre · Business Dashboard (morning briefing)
```

**Core owns the capability.** Industry Apps (Real Estate, Accommodation, Finance, Services, …) contribute **feed profiles** — topics, publishers, geographies, competitor watchlists — not separate “News Apps.”

---

## Pipeline

```
Collect          curated / licensed / RSS / partner feeds (start curated)
       ↓
Filter           relevance · freshness · industry · geo · duplicates · quality
       ↓
Understand       AI Service: summary · themes · entities · “why it matters”
       ↓
Personalise      org profile + apps + connected data + goals
       ↓
Act              insight → Opportunity / Task / Campaign / Notification (roadmap)
```

### Personalisation inputs

| Input | Source |
|-------|--------|
| Industry | Business Profile / installed Industry App |
| Location | Business Profile / Country Pack |
| Services / offerings | Profile + Services / catalogue |
| Target market | Profile / Twin |
| Competitors | Declared watchlist (honest — no invented scores) |
| Goals | Profile / Success Score gaps / Opportunities |
| Connected data | Connectors + Twin metrics |
| Apps installed | App Registry |

Do **not** invent personalisation when inputs are missing — degrade to industry × location curated briefing.

---

## UI concept (when we build)

**Daily briefing** of attributed source cards — not a full-text reader:

| Field | Purpose |
|-------|---------|
| Headline | Short; prefer publisher’s title |
| Publication | Named source |
| Date | Published / ingested |
| Short AI summary | Transformative analysis — not a reprint |
| DigitalGate insight | Why it matters *for this org* |
| Source link | Outbound to original |

**Copyright / fair-use posture (non-negotiable):**

1. Attribute every item (publication + link + date).  
2. Summarise and analyse — **never** store or display full article bodies as the product.  
3. Prefer licensed / partner / official RSS where available; Phase 1 is **curated allow-list**, not open web crawl.  
4. Quotes stay short and clearly marked when used.  
5. Respect robots / terms; no scrape-to-reproduce pipeline.

---

## Feed profiles (Industry Apps)

Profiles are data, not Apps:

| Profile | Example focus (illustrative) |
|---------|------------------------------|
| **Real Estate** | AU housing market, portals, agency regulation, suburb/region signals |
| **Accommodation** | Tourism, OTA policy, regional demand, hospitality ops |
| **Finance** | Rate / regulation / SMB finance signals (later) |
| **Services** | Trade / local demand / compliance (later) |

Each profile: allowed sources, topic tags, geo scope, exclude list, refresh cadence.

**Phase 1:** Real Estate curated sources only.

---

## Command Centre & Opportunity Engine hooks

Honest roadmap — not shipped:

```
Article / feed item
       ↓
AI insight (org-scoped)
       ↓
Optional: Platform Opportunity (kind e.g. ops | attention | expansion)
       ↓
Execute hints → Task · Campaign · Notification · deep-link
```

| Surface | Role |
|---------|------|
| **Business Dashboard** | Morning briefing strip (customer) |
| **Core Opportunities** | Ranked opportunities fed by insights (when Act ships) |
| **Command Centre** | Staff view of market themes across tenants / prospects (later) |

**Naming:** customer UI says Opportunities / Briefing; internal IP remains **Opportunity Engine™**. Industry Intelligence never rebrands as Opportunity Engine.

See [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) · [COMMAND-CENTRE.md](../COMMAND-CENTRE.md).

---

## Holds (do not break)

| Hold | Why |
|------|-----|
| No fake competitor scores / citation ranks | Honesty bar — same as Opportunity Engine MRR rules |
| Opportunity Engine™ stays internal IP name | Customer-facing: Opportunities |
| Brand Studio remains separate Core roadmap | [BRAND-STUDIO.md](./BRAND-STUDIO.md) |
| No digitalgate.com.au cutover dependency | Gen 2 app.digitalgate.com.au track |
| Reputation Growth App may be dirty nearby | Do not clobber Reviews work — this track is docs + optional Core stub only |

---

## Phased roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **0** | Architecture + copyright + feed-profile model + cross-links (this doc); roadmap catalogue item | **Now** |
| **1** | RE curated source allow-list + briefing card stub (summary + attribution + link); no crawler | Later |
| **2** | Personalisation from Business Profile / apps / Twin; notification optional | Later |
| **3** | Act path — insight → Opportunity / Task / Campaign with execute hints; Command Centre themes | Later |

**Explicitly not in Phase 0–1:** full news aggregation product, open-web crawler, paywalled republishing, autonomous “AI journalist,” fake authority scores, standalone Industry Intelligence App store listing.

---

## Suggested first build slice (later)

1. Curated Real Estate allow-list (5–15 reputable AU sources / RSS).  
2. Ingest metadata + short AI summary via AI Service (template fallback OK).  
3. Org-agnostic then industry-scoped briefing stub on Overview or a Core “Briefing” surface.  
4. Each card: headline, publication, date, summary, DG insight placeholder, source link.  
5. No Opportunity create until Phase 3 detectors are honest.

---

## Code touchpoints (future)

| Concern | Likely home |
|---------|-------------|
| Types / feed profiles | `packages/platform-core` (new module — not conflate with BI `intelligence/`) |
| AI summarise | AI Service (`/api/v1/ai/assist` + dedicated tool ids) |
| Roadmap catalogue | `packages/platform-core/src/roadmap` — `core.industry_intelligence` |
| Consumers | Overview briefing, Notifications, Opportunity Engine detectors, Universal Search |

Existing `packages/platform-core/src/intelligence/` is the **BI Engine** (“what should I do next?” from Twin/scores). Keep Industry Intelligence as a **separate module** when code lands.

---

## Related

- [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) — Core vs Apps taxonomy  
- [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) — network cohort moat (distinct)  
- [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) — Act target  
- [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) — staff orchestration  
- [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) — Understand layer  
- [BRAND-STUDIO.md](./BRAND-STUDIO.md) — separate Core roadmap  
- [ROADMAP.md](../ROADMAP.md) — execution filter  
