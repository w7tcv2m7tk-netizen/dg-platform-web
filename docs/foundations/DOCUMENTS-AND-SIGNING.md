# Documents & Signing

**Status:** Architecture lock — August 2026  
**Layer:** **CORE** (not Infrastructure, not an Industry App)  
**Nav label:** Documents  
**Capability:** Documents & Signing  
**Version:** Core — Documents v1 (MVP)

---

## Ownership principle (developer lock)

**Documents is a Core business capability, not an Industry App.** Industry Apps may create, associate and surface documents in their own workflows, but the underlying document record, storage, status, signing lifecycle and audit history belong to **Core Documents**.

**Real Estate is the first consumer of Core Documents, not the owner of the document system.**

That distinction prevents architectural pain later when Property Management, Legal, Finance and Services consume the same engine.

---

## Product lock

```
CORE
  CRM
  Commerce
  Design Studio
  Documents          ← nav
        │
        └── Documents & Signing   ← capability
              │
              ├── Real Estate → agency agreements, disclosures, contracts
              ├── Property Management → management agreements, inspections
              ├── Legal / Conveyancing → engagement, authorities, contracts
              ├── Finance → loan documents
              └── Services → proposals, agreements, forms
```

Industry Apps **consume** Core Documents. They do not each invent their own PDF store or signing stack.

**Do not** put PDF signing under Infrastructure (domains / hosting / email). Infrastructure powers digital presence; Documents runs the **business record layer**.

Manual upload is **MVP implementation**, not the product definition. The user-facing surface is:

**Upload · Create · Send for signature · Track · Complete**

The signing provider is an implementation detail behind `SigningRequest` / `SigningProviderId`.

---

## Split capabilities (keep clean)

| Capability | Layer | Owns |
|------------|-------|------|
| **Document Engine** | Core | Store, generate, version, relate documents to CRM / Property / Opportunity |
| **Signing Engine** | Core | Signing requests, recipients, auth, status, audit trail, completed artefacts |
| **Industry Templates** | Industry App | RE / Legal / Finance / Services templates & field maps |
| **Workflow** | Automation | What happens after signed (status, listing, tasks, notifications) |

DigitalGate owns Document + Signing **objects and workflow**. Integrate an established e-sign provider when ready — do **not** build a full DocuSign competitor from scratch first.

**AI prepare-agreement** stays locked **after** Act / Context Builder. Design Documents so AI can eventually consume it (Advisor tasks, CRM populate, human review, send, CRM update, audit) — do not ship AI document prepare in v1.

---

## Lifecycle (lock now)

Two separate dimensions — do not collapse them into one status field.

### Document status (record)

| Status | Meaning |
|--------|---------|
| `draft` | In preparation / not yet active |
| `active` | Live business record |
| `archived` | Soft-removed from active library |

### Signing status

| Status | Meaning |
|--------|---------|
| `not_required` | File on record; no signature workflow |
| `ready` | Ready to send (or awaiting send) |
| `sent` | Out with recipients |
| `viewed` | Opened by a recipient |
| `completed` | Fully signed / accepted |
| `declined` | Recipient declined |
| `expired` | Request timed out |

**MVP path:** Upload → `documentStatus: active` + `signingStatus: completed` (provider `manual_upload` as implementation detail). The model already supports Ready → Sent → Viewed → Completed when the first provider arrives.

Conceptual signing progression (product language):

Draft → Ready → Sent → Viewed → Signed → Completed → Archived

(Mapped onto the two status fields above.)

---

## Document events (catalogue lock)

Emit into the same platform event system that eventually drives Automation → Advisor → Business Brain → Timeline → Notifications. Not all need MVP emitters; the IDs are locked:

| Event | Intent |
|-------|--------|
| `document.created` | Record created |
| `document.uploaded` | Binary stored / attached |
| `document.updated` | Metadata or content replaced |
| `document.archived` | Soft-archived |
| `document.replaced` | New version supersedes prior |
| `document.signing_requested` | SigningRequest created / sent |
| `document.viewed` | Recipient viewed |
| `document.signed` | A party signed |
| `document.completed` | Signing fully complete |

Contracts: `DOCUMENT_EVENT_IDS` in `packages/platform-core/src/documents-signing/types.ts`.

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

That is a **business operating system** workflow — connected records (Contact → Agreement → Invoice → Task → Document → Signature → Activity) — not a file cabinet.

---

## Current shipping surface (Documents v1)

| Surface | Path | Status |
|---------|------|--------|
| **Core Documents app** | `/apps/documents` · Library · Templates (catalogue) | **Live** — org-scoped `OrgDocument` |
| **Documents API** | `/api/v1/documents` | **Live** — list / upload / archive |
| **RE property panels** | Real Estate → Properties → `[id]` after Listing status | **Live** — dual-write into Core |

| Panel | Role now | Role next |
|-------|----------|-----------|
| Agency agreement | Upload / view / replace / clear · dual-write Core · “Open in Documents” | Create from template · send for signature |
| Disclosure statement | Same pattern | Same evolution |

**Deploy (required before Documents works end-to-end):**

```bash
cd packages/database && npx prisma db push
```

Creates `org_documents` (incl. `document_status` / `signing_status`). Until that runs, Overview/Library soft-fail to empty (no crash). Uploads need `BLOB_READ_WRITE_TOKEN` on Vercel (same as property PDFs).

**v1 scope:** Organisation-scoped records · secure storage · upload/download · entity associations · library · manual completion · signing status model · RE integration · auditability · provider abstraction.

**Later:** CRM merge/population · templates · e-sign provider · automated sending · signature tracking · AI document preparation / review / intelligence.

---

## Core Document object

Canonical fields: [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) § Document.

Signing adds (direction — not all shipped):

- `SigningRequest` (documentId, provider, status, recipients, sentAt, completedAt)
- Provider adapter id (modular — Adobe / Dropbox Sign / DocuSign / …)
- Link to Opportunity / Property / Contact for workflow automation

Contracts: `packages/platform-core/src/documents-signing/`.  
Persistence: Prisma `OrgDocument` (`org_documents`).

---

## Provider strategy

1. Ship Document object, dual status model, permissions, versions, UI, event catalogue.  
2. Integrate one established e-sign provider behind a modular adapter.  
3. Swap providers without changing Industry App workflows.  
4. DigitalGate always remains system of record for “what was signed, by whom, linked to which opportunity.”

---

## Related

- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — Document  
- [APP-HIERARCHY.md](./APP-HIERARCHY.md) — Core vs Infrastructure  
- [PROPERTY-ECOSYSTEM.md](./PROPERTY-ECOSYSTEM.md)  
- [PROSPECTING-ENGINE.md](./PROSPECTING-ENGINE.md) — Vendor → Opportunity handoff into documents  
