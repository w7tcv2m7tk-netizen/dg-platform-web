# Universal Object Model

**Canonical object types for the DigitalGate Platform**

See also: [DOMAIN-MODEL.md](../domain/DOMAIN-MODEL.md) for business language.

---

## Rules

1. Apps **use** these types — they do not duplicate them  
2. Industry extensions use `metadata` JSON or typed extension tables keyed to universal `id`  
3. All objects are scoped by `organisation_id`  
4. All writes emit domain events (see [EVENT-CATALOGUE.md](./EVENT-CATALOGUE.md))  

---

## Identity

| Type | Description | Gen 2 table |
|------|-------------|-------------|
| `Organisation` | Tenant | `organisations` |
| `User` | Platform user (via Clerk membership) | `memberships` |
| `Contact` | Person | `contacts` |
| `Company` | Business account | `companies` |

---

## Commercial

| Type | Description | Status |
|------|-------------|--------|
| `Lead` | Pre-qualified interest | Phase 1 |
| `Opportunity` | Pipeline item | Phase 3 (RE) |
| `Deal` | Closed outcome | Phase 3 |
| `Quote` | Proposed pricing | Phase 2 |
| `Invoice` | Billing document | Phase 2 (Stripe) |
| `Subscription` | Recurring plan | Phase 2 |

---

## Operational

| Type | Description | Gen 2 table |
|------|-------------|-------------|
| `Activity` | Timeline entry (polymorphic) | `activities` |
| `Task` | Action item | Phase 1 |
| `Note` | Annotation | Phase 1 |
| `Document` | File reference | Phase 2 |
| `Event` | Calendar event | Phase 1 |

---

## Assets

| Type | Description | Primary App |
|------|-------------|-------------|
| `Property` | Real estate asset | Real Estate |
| `Accommodation` | Hospitality unit | Accommodation |
| `Vehicle` | Automotive | Automotive |
| `Product` | Catalogue item | Commerce |
| `Service` | Service offering | Services |

---

## Code

- Types: `packages/platform-core/src/objects/types.ts`  
- Schema: `packages/database/prisma/schema.prisma`  
