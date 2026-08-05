# Domain Model

**Business language and bounded contexts**

This document defines *what the business means* — not database tables (see [OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md)).

---

## Bounded contexts

| Context | Owns | Apps |
|---------|------|------|
| **Platform** | Orgs, users, billing, licensing | Core |
| **Customer** | Contacts, companies, timeline | CRM |
| **Commercial** | Leads, opportunities, deals | CRM, RE, Finance |
| **Marketing** | Campaigns, channels, content | Marketing, SEO |
| **Operations** | Tasks, calendar, documents | Core Apps |
| **Property** | Listings, appraisals, settlements | Real Estate |
| **Hospitality** | Bookings, housekeeping | Accommodation |
| **Growth** | Scores, visibility, analytics | Growth Apps |
| **Integration** | Connectors, sync state | Connectors |

---

## Core relationships (Knowledge Graph)

```
Organisation
  ├── has Digital Twin
  ├── has Digital Identity
  ├── employs Users
  ├── owns Companies
  │     └── employs Contacts
  ├── runs Campaigns
  ├── operates Websites (via Connectors)
  ├── tracks Lead Sources
  └── installs Apps
```

Industry extensions (e.g. Contact → owns Property → listed in Campaign) attach via graph edges — see `packages/platform-core/src/graph/`.

---

## Ubiquitous language (Real Estate — Roe pilot)

| Term | Meaning |
|------|---------|
| Vendor lead | Property owner requesting appraisal/report |
| Buyer lead | Enquiry on a listing |
| Pipeline stage | Vendor journey toward listing |
| Platform Live | CRM tag — site provisioned |

Gen 1 terms map to Universal Objects during migration.

---

## Glossary

| Term | Definition |
|------|------------|
| **Digital Twin™** | Complete digital state snapshot of an organisation |
| **Connector** | Integration adapter (WordPress, Stripe, …) |
| **App** | Installable product module (CRM, RE, SEO, …) |
| **Feature** | Granular capability within an App (`crm.contacts.read`) |
| **Universal Object** | Shared entity type across Apps |
