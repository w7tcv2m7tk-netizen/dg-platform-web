# Property Industry Ecosystem (canonical)

**Status:** Architecture locked · Platform Architect (Ben) · August 2026  
**Related:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) · [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md)

> **Commercial packaging:** Property is **one Industry App** ($99/mo) with Templates.  
> **Hospitality:** Short-stay / holiday rentals live under **Hospitality & Accommodation**, not Property.  
> **Implementation:** Templates may still ship as Gen 2 modules (`real-estate`, `property-management`, …) under Property.

---

## Property Industry App

```
Property ($99/mo)
  → Template (1 included; +$29/mo each additional)
  → configures navigation, objects, pipelines, AI, dashboards
```

| Template | Function | Module app id | Now? |
|----------|----------|---------------|------|
| **Real Estate** | Residential sales, listings, appraisals, buyers & vendors | `real-estate` | Flagship |
| **Property Management** | Long-term rentals, tenants, owners, leases & maintenance | `property-management` | Coming |
| **Commercial Property** | Commercial sales, leasing, landlords, tenants & assets | `commercial` | Coming |
| **Property Development** | Projects → stages → lots → buyers → settlements | `property-development` | Later |
| **Buyers Agency** | Buyer representation and search | — | Soon |
| **Valuation / Property Advisory** | Valuation engagements | — | Future |

**Do not** create a Rentals App. **Do not** fold PM into Real Estate Sales as a single module. **Do not** put Accommodation under Property — use **Hospitality & Accommodation**.  
**Do** sell Property as one Industry subscription and **activate** Templates — not five independent products for $99 each in customer language.

Marketing lock: *Property Industry App — one connected property operating platform with specialised templates…* — not “get five apps for $99.”

---

## Shared Core

```
Platform Core (CRM · Contacts · Companies · Documents · Comms · Tasks · Calendar · Commerce · Automation · AI · Reporting)
  → Property Industry
       → Real Estate | Property Management | Commercial Property | Development | Buyers Agency
  → Hospitality & Accommodation Industry
       → Short-Stay | Holiday Rentals | Hotels | F&B | Venues
```

Major product build for PM / Commercial: **Track C floor started** (Neon models + create/list APIs + UI) — registry remains **disabled** until a pilot org.
