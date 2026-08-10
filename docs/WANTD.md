# Wantd on DigitalGate

**Status:** MVP validation · August 2026  
**Organisation:** Wantd (`wantd`)  
**Vertical:** Wantd Property · [wantdproperty.com.au](https://wantdproperty.com.au)

Wantd is a **first-class Business** on the DigitalGate platform — not a separate tech stack.

```
DigitalGate Platform
        |
        +-- DigitalGate
        +-- Roe Realty
        +-- Currumbin Valley Hideaway
        +-- Aëtherra
        +-- Wantd
```

Switch via the existing OrgSwitcher (User → Organisations / businesses).

---

## Principle

Validation first: prove people submit demand, structured capture works, supply can be matched manually, and suppliers value access. Dedicated marketplace engines come later.

---

## Data model (MVP)

Use Universal Objects:

| Object | Role |
|--------|------|
| **Contact** | Buyer who submitted a Want |
| **Opportunity** | The Want / property demand (`metadata.record_kind = "want"`) |
| **Activity** | Timeline (`want_captured`) |
| **Automation / Events** | `opportunity.created` → confirmations, nurture |

A dedicated **Demand** object can be introduced later; metadata includes `demand_object_ready: false` as the migration seam.

Want stages (Opportunity.stage): `new` → `contacted` → `matching` → `match_found` → `inspection` → `negotiation` → `successful` | `closed_lost`.

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

`packages/platform-core/src/wantd/` — types, `capturePropertyWant`, `ensureWantdOrganisation`, `resolveWantdOrganisationId`.

Brand preset key: `wantd`.

---

## Out of scope (now)

Matching engine, supplier network, multi-vertical marketplace apps, separate Wantd infrastructure.
