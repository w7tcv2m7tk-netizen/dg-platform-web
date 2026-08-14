# Property Industry Ecosystem (canonical)

**Status:** Architecture locked · Platform Architect (Ben) · August 2026  
**Related:** [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [COMMERCIALLY-READY-V1.md](./COMMERCIALLY-READY-V1.md) · [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md)

---

## Locked ecosystem

| Public nav | Internal name | Function | App id | Now? |
|------------|---------------|----------|--------|------|
| **Real Estate** | **Real Estate Sales** | Residential sales, listings, appraisals, buyers & vendors | `real-estate` | Flagship |
| **Property Management** | Property Management | Long-term rentals, tenants, owners, leases & maintenance | `property-management` | Coming |
| **Commercial Property** | Commercial Property | Commercial sales, leasing, landlords, tenants & assets | `commercial` | Coming |
| **Accommodation** | Accommodation | Short-term stays, bookings, guests, hospitality | `accommodation` | Early Access |
| **Property Development** | Property Development | Projects → stages → lots → buyers → settlements | `property-development` | Later (reserved) |

**Do not** create a Rentals App. **Do not** merge Commercial into Property Management. **Do not** fold PM or Accommodation into Real Estate Sales.

Major product build for PM / Commercial / Finance: **Track C floor started** (Neon models + create/list APIs + UI) — registry remains **disabled** until a pilot org.

---

## Shared Core

```
Platform Core (CRM · Contacts · Companies · Documents · Comms · Tasks · Calendar · Commerce · Automation · AI · Reporting)
  → Real Estate Sales | Property Management | Commercial Property | Accommodation
  → (future) Property Development
```
