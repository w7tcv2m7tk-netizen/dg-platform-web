# Business Apps scaffold floor — Finance · Creator · Commercial · Automotive

**Audience:** Ben (DigitalGate) + staff reviewing product map  
**Status:** Scaffold floor (Aug 2026) — **not** closed beta  
**Depends on:** Gen 2 shell; manifests in `platform-core`; routes under `/apps/{finance|creator|commercial|automotive}`  
**Pattern peers:** Marketing / Social honest deferred surfaces (not RE / Acc / Services betas)

This is **product-map hygiene**, not a feature build. Registry stays **`enabled: false`** until a vertical earns a real pilot (like Services / Acc).

---

## Who it’s for

Staff and agencies who need to:

- See Finance / Creator / Commercial / Automotive on the Gen 2 product map
- Understand what Core to use **today** (CRM, Commerce, RE residential)
- Avoid promising broker pipelines, creator MRR, commercial rent rolls, or dealer inventory on Gen 2

Not for: licensing these Apps to clients, fake KPIs, or treating scaffolds as closed-beta product.

---

## Current state (honest)

| App | Registry | UI | Gen 1 WP |
|-----|----------|----|----------|
| **Finance** | `enabled: false` | Overview + pipeline / clients / applications scaffolds | Finance module may still be live |
| **Creator** | `enabled: false` | Overview + content / memberships / storefront scaffolds | Creator module may still be live |
| **Commercial** | `enabled: false` | Overview + properties / leases / tenants scaffolds | — (distinct from residential RE) |
| **Automotive** | `enabled: false` | Overview + inventory / leads / test-drives scaffolds | Dealership module remains ops SoT |

Roadmap items for these routes are marked **`scaffold`**.

---

## What’s IN this floor

| Area | Included |
|------|----------|
| Manifests | Routes, permissions, automation/AI declarations (unchanged intent) |
| Shell routes | Dedicated pages (not catch-all placeholders) with subnav |
| Honesty | Amber deferred banner; empty states; no fake scores / citations / MRR |
| Core links | CRM / Commerce / RE pointers from overviews |
| App guides | Setup guide steps pointing at scaffolds + Core |
| Staff doc | This checklist in Command → Platform docs |

---

## What’s OUT (do not promise)

- Closed-beta flags / provision buttons (unlike `acc.beta` / `re.beta`)
- Neon domain tables for loans, leases, vehicles, creator content
- Lender integrations, OTA-style inventory sync, membership billing product
- Enabling Apps in the default registry for all orgs
- Opportunity Engine™ customer-facing scores on these surfaces

---

## Smoke path (5–10 min)

Direct URLs work even while Apps are registry-disabled (same as Marketing).

1. `/apps/finance` — deferred banner, Core links, subnav.
2. `/apps/finance/pipeline` · `/clients` · `/applications` — honest empties.
3. `/apps/creator` → memberships / storefront — Commerce pointers.
4. `/apps/commercial` → properties / leases / tenants — “not residential RE” copy.
5. `/apps/automotive` → inventory / leads / test-drives — Gen 1 dealer note.
6. Staff: `/command/docs/business-apps-scaffold` — this doc.
7. Setup guides: `/dashboard/apps/{finance|creator|commercial|automotive}/setup` (or org setup href).

---

## Next increments (when a vertical is chosen)

1. Pick **one** App for a real pilot (likely Finance or Automotive if Gen 1 clients pull).
2. Add domain module + beta flag (mirror Acc / Services — not all four at once).
3. Enable registry + AppInstallation for pilot orgs only.
4. Thin MVP on Core objects (CRM leads/contacts; Commerce for creator billing).

Until then: keep scaffolds honest and registry off.

---

## Architecture locks

- Core → Infrastructure → Industry → Growth — Commercial ≠ Commerce App; Commercial ≠ residential RE. See [APP-HIERARCHY.md](./APP-HIERARCHY.md).
- Opportunity Engine™ is internal IP — soft language only on customer surfaces.
- Honesty holds: no fake scores, citations, or MRR.
