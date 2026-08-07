# Universal Object Model

**Canonical object types for the DigitalGate Platform**

> **Authoritative specification:** [foundations/CORE-OBJECT-SPECIFICATION.md](../foundations/CORE-OBJECT-SPECIFICATION.md) — mandatory fields, relationships, ownership, events for each object.

See also: [DOMAIN-MODEL.md](../domain/DOMAIN-MODEL.md) for business language.

---

## Rules

1. Apps **use** these types — they do not duplicate them  
2. Industry extensions use `metadata` JSON or typed extension tables keyed to universal `id`  
3. All objects are scoped by `organisation_id`  
4. All writes emit domain events (see [EVENT-CATALOGUE.md](./EVENT-CATALOGUE.md))  
5. **People:** only `Contact` — never Guest / Vendor / Buyer / Customer / Client / Borrower / Member as Universal Objects ([CONTACTS-AND-APP-ROLES.md](../foundations/CONTACTS-AND-APP-ROLES.md))

---

## Identity

| Type | Description | Platform 1.0 |
|------|-------------|--------------|
| `Organisation` | Tenant | ✅ |
| `User` | Platform user (via Membership) | ✅ |
| `Contact` | Person (sole people type — app roles attach here) | ✅ |
| `Company` | Business account | ✅ |

> **Not Universal Objects:** Accommodation Guest Profile, RE Vendor/Buyer links, Finance Borrower — app contexts on Contact.

---

## Commercial

| Type | Description | Platform 1.0 |
|------|-------------|--------------|
| `Lead` | Pre-qualified interest | ✅ |
| `Opportunity` | Pipeline item | 1.5 (RE) |
| `Deal` | Closed outcome | 1.5 |
| `Quote` | Proposed pricing | 1.5 |
| `Invoice` | Billing document | 1.5 |
| `Subscription` | Recurring plan | 1.5 |

---

## Operational

| Type | Description | Platform 1.0 |
|------|-------------|--------------|
| `Activity` | Timeline entry (polymorphic) | ✅ |
| `Task` | Action item | ✅ |
| `Note` | Annotation | 1.0 (via Activity) |
| `Document` | File reference | 1.5 |
| `Event` | Calendar event | 1.5 |

---

## Marketing & assets

| Type | Description | Platform 1.0 |
|------|-------------|--------------|
| `Campaign` | Marketing initiative | 1.5 |
| `Asset` | Brand/media asset | 1.5 |

---

## Industry assets

| Type | Description | Primary App | Platform 1.0 |
|------|-------------|-------------|--------------|
| `Property` | Real estate asset | Real Estate | 1.5 |
| `Booking` | Accommodation reservation | Accommodation | 2.0 |
| `Accommodation` | Hospitality unit | Accommodation | 2.0 |
| `Vehicle` | Automotive | Automotive | 2.0+ |
| `Product` | Catalogue item | Commerce | 2.0+ |
| `Service` | Service offering | Services | 2.0+ |

---

## Code

- Types: `packages/platform-core/src/objects/types.ts`  
- Schema: `packages/database/prisma/schema.prisma`  
- Full spec: [CORE-OBJECT-SPECIFICATION.md](../foundations/CORE-OBJECT-SPECIFICATION.md)
