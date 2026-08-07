# DigitalGate — Platform Principles

**Engineering constitution for Generation 2**

**Version:** 1.2  
**Last updated:** August 2026  
**Status:** Every architectural decision must align with these principles

---

These principles are non-negotiable defaults. Exceptions require explicit documentation and review.

---

## 1. API First

All functionality is exposed through the **Platform API**.

- Apps, Connectors, Automations, and AI consume the **same APIs**
- **No direct database access** from application UI
- Internal and external consumers follow identical paths

```
App UI  →  Platform API  →  Core Service  →  Repository  →  Database
```

Public APIs remain **backwards compatible** through versioning (`/v1/`, `/v2/`).

---

## 2. AI Native

Artificial Intelligence is **not a standalone feature**.

- Every App is designed to leverage the shared **AI Service**
- Apps expose structured data and tools — not raw database access
- AI context comes from Universal Objects, the **Knowledge Graph**, **Digital Twin**, and **Business Memory**

---

## 3. Multi-Tenant by Design

Every object belongs to an **Organisation**.

- All repositories, services, and APIs **enforce organisation isolation**
- No query without `organisation_id` scope
- Cross-tenant access is forbidden at the repository layer

Future: **Workspace** scoping beneath Organisation where required.

---

## 4. Event Driven

Every significant business action publishes a **domain event**.

- Features **respond to events** — they do not call each other directly
- Automation, notifications, analytics, AI, and Connectors subscribe to the **Event Bus**
- Start in-process; migrate to durable queues at scale

---

## 5. Modular

Every feature exists as exactly one of:

| Layer | Examples |
|-------|----------|
| **Platform Core** | Auth, orgs, billing, permissions |
| **App** | CRM, Real Estate, SEO |
| **Connector** | WordPress, Stripe, Google |
| **Shared Service** | AI, Scoring, Business Memory, BI Engine |

Avoid tightly coupled functionality. If it doesn't fit a layer, reconsider the design.

---

## 6. Universal Objects

**Never create duplicate object models.**

Industry Apps **extend** shared objects — they do not create parallel entities for Contact, Lead, Property, etc.

**People:** only one Universal Contact. Do **not** create Guest, Vendor, Buyer, Customer, Client, Borrower, or Member as separate people objects — Apps add roles/context on Contact ([foundations/CONTACTS-AND-APP-ROLES.md](./foundations/CONTACTS-AND-APP-ROLES.md)).

Relationships are modelled in the **Digital Knowledge Graph**, not duplicated in app-specific tables.

---

## 7. Connector First

External platforms integrate through **Connectors**.

The Platform remains **independent** of any specific CMS, accounting package, or third-party application.

WordPress is a Connector. Shopify is a Connector. Not the foundation.

---

## 8. Security by Default

- **Least privilege** — feature-based permissions (`crm.contacts.read`)
- **Audit every write operation** — actor, org, before/after
- **Secure secrets** — server-side only; never in client bundles
- **Encrypt data** where appropriate (PII, credentials, tokens)

---

## 9. Mobile Ready

Every new feature is designed with **future mobile support** in mind:

- Responsive layouts via shared **Design System** (`packages/ui`)
- API-first data access (mobile apps consume same Platform API)
- No UI logic that assumes desktop-only interaction

---

## 10. API Versioning

Public and partner APIs must remain **backwards compatible** through explicit versioning.

- Breaking changes require a new API version
- Deprecation periods documented in changelog
- Connectors pin to supported API versions

---

## 11. Digital Presence Boundary

Every new capability must answer:

> **Would a business reasonably expect to manage this as part of its digital presence?**

If yes, it belongs in the DigitalGate ecosystem (Core, App, Connector, or Shared Service). If no, keep it external.

**Current execution filter:** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer until the active release exit criteria are met.

See [CAPABILITY-MODEL.md](./CAPABILITY-MODEL.md) for the full capability map.

---

## Decision checklist

Before shipping any feature, confirm:

- [ ] Passes the **digital presence boundary rule** (Principle 11)?
- [ ] Passes the **current execution filter** (Core / RE)?
- [ ] Exposed via Platform API (not direct DB from UI)?
- [ ] Scoped to `organisation_id`?
- [ ] Publishes domain events on write?
- [ ] Uses Universal Objects (no duplicate models)?
- [ ] Uses shared UI components where applicable?
- [ ] Permissions declared in Feature Registry?
- [ ] Contributes to Digital Twin / Knowledge Graph where relevant?
- [ ] AI context available through Business Memory + AI Service?
- [ ] Write operations audited?
- [ ] Mobile-responsive layout?

---

## Related documents

- [CAPABILITY-MODEL.md](./CAPABILITY-MODEL.md)
- [PRODUCT-VISION.md](./PRODUCT-VISION.md)
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
