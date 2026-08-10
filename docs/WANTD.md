# Wantd on DigitalGate

**Status:** MVP validation · August 2026  
**Organisation:** Wantd (`wantd`)  
**Vertical:** Wantd Property · [wantdproperty.com.au](https://wantdproperty.com.au)  
**Classification:** Business / Organisation — **not** a DigitalGate App

---

## 11. Architectural Classification (locked)

Wantd is initially a **Business/Organisation**, not a dedicated DigitalGate App.

The MVP must use existing DigitalGate **Core** infrastructure and **Universal Objects** wherever possible.

**Do not create a dedicated Wantd App** unless the functionality cannot reasonably be represented through existing Core services and objects.

### Initial implementation

```
Wantd Business (Organisation)
  → CRM (Core App)
  → Contact
  → Opportunity
       · Type: Demand / Want
       · Property requirement data (metadata)
  → Automation
  → AI
  → Matching workflow (manual for MVP)
  → Reporting
```

There is **no** `wantd` entry in the App Registry. Public capture (`/wantd/property`) and `packages/platform-core/src/wantd/` are **org-scoped domain helpers**, not an App manifest.

### Anticipated future Universal Object

```
Contact
  → Demand          ← future Universal Object
  → Matching Engine
  → Supply
  → Opportunity     ← commercial deal / listing response
  → Deal
```

For MVP validation, **Demand is represented as an Opportunity** with:

| Field | Value |
|-------|--------|
| `metadata.opportunity_type` | `"demand"` |
| `metadata.record_kind` | `"want"` |
| `metadata.category` | `"property"` (+ requirement payload) |
| `metadata.demand_object_ready` | `false` (migration seam) |
| `pipelineId` | `wantd_property_want` |

### If validation succeeds — future Business App

Wantd may later become a dedicated **Business App** containing:

* Demand Engine  
* AI Intent Understanding  
* Matching Engine  
* Supplier Network  
* Marketplace  
* Marketplace Analytics  
* Revenue / Referral Engine  

That App **must continue to use DigitalGate Platform Core** — do not duplicate authentication, CRM, users, billing, automation, AI, notifications, or other shared infrastructure.

### Principle

**Validate the marketplace before building marketplace-specific infrastructure.**

---

## Platform placement

```
DigitalGate Platform
        |
        +-- DigitalGate
        +-- Roe Realty
        +-- Currumbin Valley Hideaway
        +-- Aëtherra
        +-- Wantd          ← Organisation context only
```

Switch via OrgSwitcher (User → Organisations / businesses). Shared services: Auth, Organisations, CRM, Contacts, Opportunities, Tasks, Activities, AI, Automation, Event Bus, Notifications, Reporting, Billing.

---

## Data model (MVP)

| Object | Role |
|--------|------|
| **Contact** | Buyer who submitted a Want |
| **Opportunity** | Demand / Want (structured type + Wantd metadata) |
| **Activity** | Timeline (`want_captured`) |
| **Automation / Events** | `opportunity.created` → confirmations, nurture |

Want stages (`Opportunity.stage`): `new` → `contacted` → `matching` → `match_found` → `inspection` → `negotiation` → `successful` \| `closed_lost`.

---

## Surfaces

| Surface | Path |
|---------|------|
| Public demand form | `/wantd/property` |
| Capture API | `POST /api/v1/wantd/property-want` |
| CRM Opportunities | `/apps/crm/opportunities` (Wantd org context) |
| Provision | `node scripts/ensure-wantd-org.mjs` · `ensureWantdOrganisation()` |

Optional env: `DG_WANTD_ORGANISATION_ID`.

---

## Code

`packages/platform-core/src/wantd/` — org resolve/provision + Want capture helpers (Core package, **not** an App).

Brand preset key: `wantd`.

---

## Out of scope (now)

Wantd App manifest, Demand Universal Object table, matching engine, supplier network, multi-vertical marketplace, separate Wantd infrastructure.
