# Documents & Signing

**Status:** Architecture lock — August 2026  
**Layer:** **CORE** (not Infrastructure)  
**Principle:** DigitalGate owns the business workflow and document record. The customer should not care which e-sign provider performs the signature.

---

## Product lock

```
CORE
Documents & Signing
        │
        ├── Real Estate
        │     ├── Agency Agreement
        │     ├── Disclosure
        │     └── Contract
        │
        ├── Legal
        │     ├── Engagement
        │     └── Authority
        │
        ├── Finance
        │     └── Loan Documents
        │
        └── Services
              └── Service Agreement
```

Industry Apps **consume** Core Documents & Signing. They do not each invent their own PDF store or signing stack.

**Do not** put PDF signing under Infrastructure (domains / hosting / email). Infrastructure powers digital presence; Documents & Signing runs the business record.

---

## Split capabilities (keep clean)

| Capability | Layer | Owns |
|------------|-------|------|
| **Document Engine** | Core | Store, generate, version, relate documents to CRM / Property / Opportunity |
| **Signing Engine** | Core | Signing requests, recipients, auth, status, audit trail, completed artefacts |
| **Industry Templates** | Industry App | RE / Legal / Finance / Services templates & field maps |
| **Workflow** | Automation | What happens after signed (status, listing, tasks, notifications) |

DigitalGate owns Document + Signing **objects and workflow**. Integrate an established e-sign provider initially if that is faster and legally defensible — do **not** build a full DocuSign competitor from scratch first.

---

## Target CRM-connected workflow

Not merely: Upload PDF → store PDF.

```
Opportunity → Create Document → Select Template → Populate from CRM
  → Send for Signature → Track → Signed → Store → Update Opportunity
```

### Real Estate example

```
Vendor Prospect
  → Appraisal
  → Opportunity
  → Agency Agreement
  → Send for signature
  → Vendor signs
  → Document stored automatically
  → Opportunity status → Listing Won
  → Listing created
```

That is a **business operating system** workflow, not a document-management feature.

---

## Current shipping surface (keep; evolve role)

Existing property panels remain. They become the **property-specific view** into Core Documents & Signing — not a throwaway upload silo.

**Where today:** Real Estate → Properties → `[id]` → after Listing status

| Panel | Path / component | Role now | Role next |
|-------|------------------|----------|-----------|
| Agency agreement | `PropertyAgencyAgreementPanel` · `/api/v1/properties/[id]/agency-agreement` | Upload / view / replace / clear signed PDF | Upload **or** create from template · send for signature · status · download signed |
| Disclosure statement | `PropertyDisclosureStatementPanel` · `…/disclosure-statement` | Same pattern | Same evolution |

Same UI destination later may also expose Contract and other RE document types once templates + Signing Engine land.

---

## Core Document object

Canonical fields and ownership: [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) § Document.

Signing adds (direction — not all shipped):

- `SigningRequest` (documentId, provider, status, recipients, sentAt, completedAt)
- Audit events (`signing.sent`, `signing.viewed`, `signing.completed`, `signing.declined`)
- Provider adapter id (modular — Adobe / Dropbox Sign / DocuSign / …)
- Link to Opportunity / Property / Contact for workflow automation

Contracts live in `packages/platform-core/src/documents-signing/`.

---

## Provider strategy

1. Ship Document object, permissions, versions, UI, audit trail.  
2. Integrate one established e-sign provider behind a modular adapter.  
3. Swap providers without changing Industry App workflows.  
4. DigitalGate always remains system of record for “what was signed, by whom, linked to which opportunity.”

---

## Related

- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — Document  
- [APP-HIERARCHY.md](./APP-HIERARCHY.md) — Core vs Infrastructure  
- [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md)  
- [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md) — Vendor → Opportunity handoff into documents  
