# Property Industry Ecosystem (canonical)

**Status:** Architecture locked · Platform Architect (Ben) · August 2026  
**Related:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) · [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md)

> **Commercial packaging:** Property is **one Industry App** ($99/mo) with specialisations / templates.  
> **Implementation:** Specialisations may still ship as Gen 2 modules (`real-estate`, `accommodation`, …) that map into the Property platform.

---

## Property Industry App

```
Property ($99/mo)
  → Specialisation (1 included; +$29/mo each additional)
  → Template (configures navigation, objects, pipelines, AI, dashboards)
```

| Specialisation | Template (target) | Function | Module app id | Now? |
|----------------|-------------------|----------|---------------|------|
| **Real Estate** | Real Estate Agency | Residential sales, listings, appraisals, buyers & vendors | `real-estate` | Flagship |
| **Property Management** | Property Manager | Long-term rentals, tenants, owners, leases & maintenance | `property-management` | Coming |
| **Commercial Property** | Commercial Property | Commercial sales, leasing, landlords, tenants & assets | `commercial` | Coming |
| **Accommodation** | Short-Stay | Short-term stays, bookings, guests, availability & revenue | `accommodation` | Early Access |
| **Property Development** | Property Development | Projects → stages → lots → buyers → settlements | `property-development` | Later (reserved) |

**Do not** create a Rentals App. **Do not** fold PM or Accommodation into Real Estate Sales as a single module. **Do not** put Accommodation under Hospitality.  
**Do** sell Property as one Industry subscription and **activate** specialisations — not five independent products for $99 each in customer language.

Marketing lock: *Property Industry App — one connected property operating platform with specialised templates…* — not “get five apps for $99.”

---

## Shared Core

```
Platform Core (CRM · Contacts · Companies · Documents · Comms · Tasks · Calendar · Commerce · Automation · AI · Reporting)
  → Property Industry
       → Real Estate | Property Management | Commercial Property | Accommodation | (future) Development
```

Major product build for PM / Commercial: **Track C floor started** (Neon models + create/list APIs + UI) — registry remains **disabled** until a pilot org.
