# Industry Platform (canonical Gen 2)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Supersedes:** Treating every vertical as a separate top-level Industry App SKU  
**Related:** [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md) · [SERVICES-APP.md](./SERVICES-APP.md) · [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md)  
**Code:** `packages/platform-core/src/industry/platform.ts`

---

## Canonical model

```
CORE → INFRASTRUCTURE → INDUSTRY → SPECIALISATION → TEMPLATE → GROWTH → INTELLIGENCE
```

| Layer | Role |
|-------|------|
| **Industry App** | Commercial product the customer buys (e.g. Property — $99/mo) |
| **Specialisation** | Business type within that Industry (e.g. Real Estate, Accommodation) |
| **Template** | Configuration that makes DigitalGate behave correctly for that business |

**Internal name:** Industry Platform → Specialisation → Template  
**Customer-facing name:** Industry Apps (simpler commercially)

Templates configure: objects · fields · pipelines · workflows · automations · forms · documents · dashboards · AI context · terminology · permissions · reporting.

Onboarding path:

```
Create Business → Select Industry → Select Specialisation → Apply Template → Activate
```

---

## Industry map

| Industry App | Specialisations | Roadmap |
|--------------|-----------------|---------|
| **Property** | Real Estate · Property Management · Accommodation · Commercial Property · Property Development | Founding / Live (RE, Acc, PM first) |
| **Finance** | Accounting & Bookkeeping (first) · Financial Planning · Mortgage & Finance Broking · Insurance · Lending · Business Advisory · Wealth · Super | Founding / Coming |
| **Services** | Trades · Cleaning · Maintenance · Construction · Landscaping · Field Services | Founding / Coming |
| **Commerce** | Retail · E-commerce · Wholesale · Distribution | Coming Soon |
| **Automotive** | Dealerships · Automotive Services · Mechanical · Detailing | Coming |
| **Creator** | Creators · Music & Media · Artists | Coming |
| **Healthcare** | Medical · Allied Health · Dental · Clinics | Future |
| **Education** | Training · Providers · Coaching · Schools | Future |
| **Hospitality** | Restaurants · Cafés · Venues · Groups | Future — **not** Accommodation |

### Explicit exclusions

| Do not | Why |
|--------|-----|
| Call Finance “Accounting” | Excludes brokers, advisers, insurance, etc. |
| Make “Commercial” a top-level Industry | Segment, not industry — Commercial Property is a Property specialisation |
| Put Accommodation under Hospitality | Accommodation = Property + Booking + Guest |
| Create a separate Retail App | Use **Commerce** with Retail / E-commerce / Wholesale templates |
| Market “all Property apps for $99” | One Industry platform + activate specialisations |

---

## Commercial lock

| Rule | Detail |
|------|--------|
| Industry subscription | **$99/mo** per Industry App |
| Included | **One** active specialisation / template |
| Expansion | Additional specialisations **+$29/mo** each (or +$49 if heavy) |
| Marketing | “One connected [Property] operating platform with specialised templates…” |
| Land-and-expand | Agency adds PM / Accommodation without buying five separate products |

Implementation note: Gen 2 still has installable modules (`real-estate`, `accommodation`, …). They map to **specialisations** under Property. Billing migration to a single Property SKU can follow; product language locks **now**.

---

## Public explanation (copy lock)

> **Industry Apps** — Built around the way your business actually operates.  
> DigitalGate’s Industry Apps provide specialised capabilities for different types of businesses while sharing the same connected Core Platform.  
> Choose the Industry that matches your business, then activate the specialisation and workflows you need.  
> **One platform. One source of truth. Configure it around your business.**

---

## Template principle

Same pattern as Services App:

```
Industry App → Industry Templates → Workflows + Objects + Fields + Automations + Documents + Dashboards
```

Selecting **Finance → Accounting & Bookkeeping** configures navigation, objects, pipelines, automations, AI and dashboards — not just a different homepage label.

Future: Template Marketplace (DigitalGate + partner templates).

---

## Accountants as channel

Accounting & Bookkeeping is the **first Finance specialisation** because practices have large client bases, recurring work, documents, deadlines, and trust — and can become a distribution channel into SME clients.

---

## Related code

| Export | Purpose |
|--------|---------|
| `INDUSTRY_PLATFORMS` | Canonical map |
| `INDUSTRY_COMMERCIAL_LOCK` | Pricing / wording |
| `FINANCE_TEMPLATES` | Finance template keys |
| `resolveIndustryFromAppId` | Map Gen 2 app → platform + specialisation |
| `BILLABLE_INDUSTRY_PLATFORMS` | Founding + Coming (exclude Future-only SKUs from sell sheet) |
