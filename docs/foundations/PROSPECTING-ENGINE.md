# Prospecting & Opportunity Engine

**Status:** Architecture lock — August 2026  
**Commercial:** Growth App — **$99/mo** (Discovery included; not a separate SKU)  
**Principle:** Different front ends for different jobs. One underlying opportunity engine and one business record.

**Positioning:**

> Find the right businesses. Understand their situation. Know which opportunities deserve your attention.

DigitalGate’s intelligent prospecting and opportunity engine turns business discovery into qualified pipeline — using business, digital presence, CRM and AI signals in one connected system.

---

## Discovery UX (locked direction)

| Layer | Job |
|-------|-----|
| **Discovery** | Finds them |
| **Intelligence** | Understands them (Business Intelligence Profile) |
| **Scoring** | Ranks them (Opportunity Score™ + Why this prospect?) |
| **CRM** | Manages the qualified relationship |
| **Pipeline** | Manages the opportunity |
| **Automation** | Drives follow-up |

**Prospect ≠ CRM Company.** Discovery builds the prospect book; CRM stays clean until convert.

**Terminology:** Tenant Growth App = **Prospecting & Opportunity Engine**. Staff GTM = **Growth Engine** (Command Centre). Do not use those names interchangeably for customers.

**ABN + Places:** Australian differentiator — Places for discovery, ABN for identity; enrich toward full Business Intelligence Profile.

### Prospect Pipeline workspace

Discovery finds them. **Prospect Pipeline** manages and qualifies them.

Customer-facing stages (map onto Growth Engine internals):

`Discovered → Researching → Qualified → Contacted → Engaged → Converted → Lost`

Each stage surfaces count, avg Opportunity Score™, action CTA, and (when available) per-card Why / Next action / last activity. Framework ships even at zero prospects — do not leave a bare empty page.

---

## Dual product lock (firm)

You effectively have **two products** on the same underlying engine:

| Side | Surface | Who | Job |
|------|---------|-----|-----|
| **Operator** | Command Centre → Prospecting | DigitalGate staff | Acquire DigitalGate customers (GTM) |
| **Customer** | Growth → Prospecting & Opportunity Engine | Tenant | Find and convert *their* prospects |

Staff operating surface for DigitalGate GTM remains under Command Centre Prospecting.  
**This Growth App is the tenant-facing product.** Do not blur the two.

---

## Tenant journey (locked)

```
1. PROSPECT     Find the right businesses
2. DISCOVER     Understand business, digital presence and situation
3. SCORE        Fit × Need × Reachability × Commercial × Weakness
4. QUALIFY      Decide whether the opportunity is worth pursuing
5. ACTIVATE     Create/promote Contact, Company and Opportunity in CRM
6. PIPELINE     Manage the opportunity through the sales process
7. AI RECOMMEND Who to contact, when, and what to do next
8. FOLLOW-UP → CONVERSION
```

**Do not** insert CRM as a conceptual step immediately after scoring.  
**Activate** is the moment the prospect joins the same business context as CRM, Twin and Brain.

---

## Opportunity Score™

Not a simple lead score:

```
Opportunity Score = Fit × Need × Reachability × Commercial × Weakness
```

UI should show dimension breakdown + band (e.g. High Opportunity) + recommended action.

### Why this prospect? (required UX pattern)

When recommending “Contact ABC Realty today”, always surface:

| Field | Example |
|-------|---------|
| **Why** | High-fit boutique agency · weak AI Visibility · no vendor funnel · declining engagement |
| **What to say** | AI Visibility opportunity + complimentary Agency Growth Audit |
| **Best contact** | John Smith — Director |
| **Best channel** | Phone |
| **Next action** | Call today |

That is what makes the product intelligent rather than a prospect database.

---

## Modules (one $99 App)

| Module | Purpose |
|--------|---------|
| Discovery | Business information, digital presence and market signals |
| Opportunity Scoring™ | Fit × Need × Reachability × Commercial × Weakness |
| Prospect Pipeline | Track prospects before they become customers |
| AI Recommendations | Who to contact and what to do next |
| CRM | Promote qualified prospects into Core CRM |
| Follow-up | Calls, messages, notes, tasks and automation |
| Digital Presence Signals | Website, SEO, AI Visibility and related signals |

One App — not separate charges for Prospecting, Discovery or Opportunity Engine.

---

## Product lock

```
PROSPECTING & OPPORTUNITY ENGINE
        │
        ├── Business Discovery
        │     └── B2B prospects (businesses that may need your product/service)
        │
        ├── Vendor Discovery
        │     └── Residential property / owner prospects
        │
        ├── Buyer Discovery
        │     └── Buyer demand / matching
        │
        ├── Commercial Property Discovery
        │     └── Owners / landlords / opportunities
        │
        └── Industry Discovery
              └── Future vertical-specific prospect models
```

The **underlying engine is shared**. Each Industry App supplies its own:

| Supplied by Industry App | Examples |
|--------------------------|----------|
| Prospect type | Business · Vendor (owner) · Buyer · Landlord |
| Data sources | Places/ABN · modular property providers · CRM · campaigns |
| Scoring model | Business opportunity · **Property Opportunity Score™** |
| Signals | Digital presence · ownership tenure · comps · equity · demand |
| Qualification criteria | Fit / need / reachability vs vendor readiness |
| Recommended actions | Audit call · complimentary appraisal |
| Compliance rules | AU privacy · data licensing · platform terms |
| Workflow | Prospect Book → pipeline vs Property → appraisal → listing |
| CRM objects | Company/Contact/Opportunity · Property/Lead/Opportunity |

**Do not** build separate prospecting systems per industry.  
**Do not** force residential / consumer prospects into the generic B2B prospect book.

---

## Two kinds of prospecting

### 1. Business Prospecting

Used by DigitalGate customers (B2B services, finance, commercial property brokers as businesses, trades, etc.) — and mirrored for staff GTM under Command Centre.

**Job:** Find **businesses** that may need your product or service.

**Tenant surface:** Growth → **Prospecting & Opportunity Engine** → Business Discovery  
**Canonical routes:** `/apps/prospecting/*`

### 2. Consumer / Property Prospecting

Used by Real Estate, Accommodation, Legal, consumer services, etc.

**Job:** Find **people, properties, events or circumstances** that represent an opportunity.

**Surface:** Industry App (not a dump of the Growth business prospect book).

---

## Real Estate → Vendor Prospecting

Lives in the **Real Estate App**, not as “houses in the Growth Prospect Book.”

```
Vendor Prospecting
  → Residential Properties
  → Market Signals
  → Potential Vendors
  → Opportunities
  → Appraisals
  → Listings
```

**Agent experience (locked):**  
Not a giant database of random houses.  
**“Here are the 12 property owners most worth speaking to this week, and here’s why.”**

### Property Opportunity Score™

Differentiated RE product output, e.g.:

> **84/100 — High Vendor Potential**  
> Owned 11 years · Comps strong · Equity high · Buyer demand high · Renovation ads · CRM relationship · Last contacted 14 months ago  
> **Recommended action:** Offer a complimentary market appraisal.

Feeds the same **CRM Opportunities** and **Business Brain** as other discovery modes.

---

## Where it appears

| Customer | Front end |
|----------|-----------|
| Normal DigitalGate / B2B | Growth → Prospecting & Opportunity Engine |
| Real Estate | Real Estate → Vendor Prospecting · Buyer Opportunities · Appraisal Pipeline · Listings |
| Command Centre | Staff GTM — “Who should I speak to today?” — not the tenant Growth App |

All modes ultimately feed **one Opportunity Engine** and **one business record**.

---

## Command Centre vs Growth App

| Layer | Role |
|-------|------|
| **Growth App** | Tenant capability (Business Discovery, pipeline, scores, activity) |
| **Industry App** | Domain front end (e.g. Vendor Prospecting) |
| **Command Centre** | DigitalGate operator GTM + intelligence / action layer |

Operator principle: complexity underneath; the operator sees what to do next.

---

## Organisation scoping (mandatory)

Every prospect, discovery record, audit, engagement, score and opportunity carries `organisationId`.  
All reads/writes enforce scope **server-side**. Never allow cross-tenant leakage of commercially valuable discovery intelligence.

---

## Data sources (caution)

Residential-owner and property prospecting sources must be designed around:

- Australian **privacy** law  
- **Data licensing**  
- Provider / platform **terms**

The **data-source layer is modular**. Do **not** hard-code a particular property-data provider into Platform Core. Industry Apps / connectors register providers behind a stable contract.

See `packages/platform-core/src/prospecting-engine/`.

---

## Business Brain

The Brain should not only know “200 contacts.” It should understand:

> There are 37 potential vendor opportunities in your target suburbs, 8 have strong market signals, and 3 are worth contacting today.

That is operating intelligence — not a CRM with a prospecting add-on.

---

## Related

- [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) — Business (B2B) Discovery only  
- [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) — Core opportunity objects & scoring  
- [BUSINESS-BRAIN.md](./BUSINESS-BRAIN.md)  
- [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md)  
- [OPERATOR-OS.md](./OPERATOR-OS.md)
