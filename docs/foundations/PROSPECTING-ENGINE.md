# Prospecting & Opportunity Engine

**Status:** Architecture lock — August 2026  
**Commercial:** Growth App — **$99/mo** (Discovery included; not a separate SKU)  
**Principle:** Different front ends for different jobs. One underlying opportunity engine and one business record.

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

Used by DigitalGate, B2B services, finance, commercial property brokers (as businesses), trades, etc.

**Job:** Find **businesses** that may need your product or service.

**Surface:** Growth → **Prospecting & Opportunity Engine** → Business Discovery  
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

### Example signals (illustrative)

- Properties approaching likely selling periods  
- Long-term ownership  
- Absentee owners  
- Recent comparable sales  
- Significant equity potential  
- Expired / withdrawn listings where legally & commercially permissible  
- Coming off market  
- Development / subdivision potential  
- Owners with multiple properties  
- Strong local buyer demand  
- Match to known buyer requirements  
- Past vendor relationships  
- CRM contacts with property ownership  
- Appraisal / valuation campaign engagement  
- Website and advertising responses  

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
| Command Centre | “Who should I speak to today?” — actions & signals, not the full Discovery workspace |

All modes ultimately feed **one Opportunity Engine** and **one business record**.

---

## Command Centre vs Growth App

| Layer | Role |
|-------|------|
| **Growth App** | Capability (Business Discovery, pipeline, scores, activity) |
| **Industry App** | Domain front end (e.g. Vendor Prospecting) |
| **Command Centre** | Intelligence / action layer — next useful thing |

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
