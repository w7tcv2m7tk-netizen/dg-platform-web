# Industry Platform (canonical Gen 2)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Supersedes:** Treating every vertical as a separate top-level Industry App SKU; Accommodation under Property  
**Related:** [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md) · [SERVICES-APP.md](./SERVICES-APP.md) · [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) · [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md)  
**Code:** `packages/platform-core/src/industry/platform.ts`

---

## Canonical model

```
CORE → INFRASTRUCTURE → INDUSTRY → TEMPLATE → GROWTH → INTELLIGENCE
```

| Layer | Role |
|-------|------|
| **Industry App** | Commercial product the customer buys (~$99/mo) — one of twelve verticals |
| **Template** | Specialised business model within that Industry (e.g. Real Estate, Short-Stay) |

**Internal name:** Industry → Template  
**Customer-facing name:** Industry Apps (simpler commercially)

New business types become **Templates**, not new top-level Industry Apps.

Templates configure: objects · fields · pipelines · workflows · automations · forms · documents · dashboards · AI context · terminology · permissions · reporting.

Onboarding path:

```
Create Business → Select Industry → Activate Template → Configure → Go live
```

---

## Classification rule

| If the business primarily… | Industry App |
|----------------------------|--------------|
| Sells or manages property (sales, PM, commercial, development) | **Property** |
| Runs stays, venues or hospitality | **Hospitality & Accommodation** |
| Manages physical / field service work | **Services** |
| Manages money / financial relationships | **Finance** |
| Sells expertise, time or professional projects | **Professional** |
| Delivers clinical / wellness care | **Health & Wellness** |
| Sells or services vehicles | **Automotive** |
| Sells products | **Retail & Commerce** |
| Creates intellectual / media output | **Creator & Media** |
| Moves goods or freight | **Transport & Logistics** |
| Primary production | **Agriculture & Primary Industries** |
| Educates or organises members | **Education & Organisations** |

Examples: surveyors and lawyers → **Professional** (Surveying / Legal templates). Accountants → **Finance**, not Professional. Short-stay and holiday rentals → **Hospitality & Accommodation**, not Property. CVH homes under Hospitality & Accommodation.

---

## Twelve Industry Apps

| Industry App | Example Templates | Public lane |
|--------------|-------------------|-------------|
| **Property** | Real Estate · PM · Commercial · Development · Buyers Agency · Valuation | Available |
| **Hospitality & Accommodation** | Short-Stay · Holiday Rentals · Hotels · Motels · Resorts · F&B · Venues | Early Access |
| **Services** | Trades · Cleaning · Maintenance · Construction · Field | Available |
| **Finance** | Accounting · Broking · Planning · Insurance · Advisory | Early Access |
| **Professional** | Legal · Surveying · Engineering · Architecture · Consulting | Coming Soon |
| **Health & Wellness** | Medical · Allied · Dental · Vet | Coming Soon |
| **Automotive** | Dealerships · Mechanical · Auto Services · Detailing | Coming Soon |
| **Retail & Commerce** | Retail · E-commerce · Wholesale · Distribution | Coming Soon |
| **Creator & Media** | Creators · Music · Media · Artists | Early Access |
| **Transport & Logistics** | Transport · Logistics · Courier | Coming Soon |
| **Agriculture & Primary Industries** | Agriculture · Primary | Architecture Reserved |
| **Education & Organisations** | Education · Training · Associations | Coming Soon |

### Public pricing honesty

Do **not** present twelve finished products. Show readiness lanes:

- **Available** — Property · Services  
- **Early Access** — Hospitality & Accommodation · Finance · Creator & Media  
- **Coming Soon** — Professional · Health & Wellness · Automotive · Retail & Commerce · Transport · Education  
- **Architecture Reserved** — Agriculture  

Commercial packaging (canonical):

| Item | Price |
|------|-------|
| **Industry App** | **$99/mo** — major vertical capability and infrastructure |
| **Primary Industry Template** | **Included** (customer chooses one primary business model) |
| **Additional Industry Templates** | **+$29/mo each** |

Terminology:

- **Industry App** = the commercial boundary (Property, Services, Finance, …)
- **Industry Template** = specialised workflow configuration within that App (Real Estate, Cleaning, Accounting, Legal, …)

Example — Property: $99 includes Real Estate; add Property Management → **$128/mo**.  
Example — Services: $99 includes Cleaning; add Maintenance → **$128/mo**.  
Example — Founding 10: Starter $99 + Property $99 + PM Template $29 = **$227** → 30% = **$158.90/mo**.

Code lock: `INDUSTRY_COMMERCIAL_LOCK` · `industryCheckoutLines()` in `packages/platform-core/src/industry/platform.ts`.

### Explicit exclusions

| Do not | Why |
|--------|-----|
| Call Finance “Accounting” | Excludes brokers, advisers, insurance, etc. |
| Build a Legal App or Surveying App | Use **Professional** → Legal / Surveying templates |
| Squeeze knowledge firms into Services | Services = physical/field work; Professional = expertise/time/projects |
| Put accountants primarily under Professional | Prefer **Finance** → Accounting |
| Make “Commercial” a top-level Industry | Commercial Property is a Property Template |
| Put Accommodation under Property | Accommodation = Hospitality & Accommodation |
| Create a separate Retail App | Use **Retail & Commerce** templates |
| Market “all Property apps for $99” | One Industry + activate Templates |
| Market twelve finished Industry products | Architecture can be broad; pricing stays honest |

**Naming note:** Industry App **Professional** ≠ DigitalGate’s own **Professional Services** revenue stream (implementation / people work in [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md)).

---

## Code surface

| Export | Role |
|--------|------|
| `INDUSTRY_PLATFORMS` | Canonical twelve |
| `INDUSTRY_PUBLIC_GROUPS` | Available / Early Access / Coming / Reserved |
| `INDUSTRY_COMMERCIAL_LOCK` | Price + terminology + founding example lock |
| `industryCheckoutLines()` | Billing: $99 Industry + +$29 extra Templates |
| `INDUSTRY_CLASSIFICATION_RULES` | Classification helpers |
