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

## Classification rule

| If the business primarily… | Industry App |
|----------------------------|--------------|
| Sells or manages property / stays | **Property** |
| Manages physical / field service work | **Services** |
| Manages money / financial relationships | **Finance** |
| Sells expertise, time or professional projects | **Professional Services** |
| Sells products | **Commerce** |
| Sells or services vehicles | **Automotive** |
| Creates intellectual / media output | **Creator** |

Examples: surveyors and lawyers → **Professional Services** (Surveying / Legal templates). Accountants → **Finance** (Accounting & Bookkeeping), not Professional Services.

---

## Industry map

| Industry App | Specialisations | Roadmap |
|--------------|-----------------|---------|
| **Property** | Real Estate · Property Management · Accommodation · Commercial Property · Development | Founding / Live (RE, Acc, PM first) |
| **Services** | Trades · Cleaning · Maintenance · Construction · Field Services | Founding / Coming |
| **Finance** | Accounting · Bookkeeping · Finance Broking · Financial Planning · Insurance · Business Advisory | Founding / Coming |
| **Professional Services** | Legal · Surveying · Engineering · Architecture · Consulting · Agencies · IT & Technology | Coming Soon |
| **Commerce** | Retail · E-commerce · Wholesale · Distribution | Coming Soon |
| **Automotive** | Dealerships · Mechanical · Automotive Services · Detailing | Coming |
| **Creator** | Music · Media · Creators · Artists | Coming |
| **Healthcare** | Medical · Allied Health · Dental · Clinics | Future |
| **Education** | Training · Providers · Coaching · Schools | Future |
| **Hospitality** | Restaurants · Cafés · Venues · Groups | Future — **not** Accommodation |

### Explicit exclusions

| Do not | Why |
|--------|-----|
| Call Finance “Accounting” | Excludes brokers, advisers, insurance, etc. |
| Build a Legal App or Surveying App | Use **Professional Services** → Legal / Surveying templates |
| Squeeze knowledge firms into Services | Services = physical/field work; Professional Services = expertise/time/projects |
| Put accountants primarily under Professional Services | Prefer **Finance** → Accounting & Bookkeeping |
| Make “Commercial” a top-level Industry | Segment, not industry — Commercial Property is a Property specialisation |
| Put Accommodation under Hospitality | Accommodation = Property + Booking + Guest |
| Create a separate Retail App | Use **Commerce** with Retail / E-commerce / Wholesale templates |
| Market “all Property apps for $99” | One Industry platform + activate specialisations |

**Naming note:** Industry App **Professional Services** ≠ DigitalGate’s own **Professional Services** revenue stream (implementation / people work in [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md)).

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

Selecting **Finance → Accounting & Bookkeeping** or **Professional Services → Legal** configures navigation, objects, pipelines, automations, AI and dashboards — not just a different homepage label.

Future: Template Marketplace (DigitalGate + partner templates).

---

## Professional Services templates (target)

| Template | Configures (examples) |
|----------|------------------------|
| **Legal Practice** | Matters, stages, deadlines, documents, time, billing, conflict checks, AI document intelligence |
| **Surveying** | Clients, projects, site jobs, quotes, scheduling, field teams, plans/files, milestones, invoicing, compliance |
| Engineering · Architecture · Consulting · Agencies · IT | Project/engagement operating models on the same Core |

---

## Accountants as channel

Accounting & Bookkeeping is the **first Finance specialisation** because practices have large client bases, recurring work, documents, deadlines, and trust — and can become a distribution channel into SME clients.

---

## Related code

| Export | Purpose |
|--------|---------|
| `INDUSTRY_PLATFORMS` | Canonical map |
| `INDUSTRY_COMMERCIAL_LOCK` | Pricing / wording |
| `INDUSTRY_CLASSIFICATION_RULES` | Property / Services / Finance / Professional Services / … |
| `FINANCE_TEMPLATES` | Finance template keys |
| `PROFESSIONAL_SERVICES_TEMPLATES` | Legal, Surveying, Engineering, … |
| `resolveIndustryFromAppId` | Map Gen 2 app → platform + specialisation |
| `BILLABLE_INDUSTRY_PLATFORMS` | Founding + Coming (exclude Future-only SKUs from sell sheet) |
