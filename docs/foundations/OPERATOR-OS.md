# DigitalGate Operator OS

**Status:** Locked architectural principle · August 2026  
**Related:** [COMMAND-CENTRE.md](../COMMAND-CENTRE.md) · [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md) · [ROLES-PERMISSIONS-SIDEBAR.md](./ROLES-PERMISSIONS-SIDEBAR.md)

---

## Principle

**DigitalGate is not merely another customer organisation using its own platform.**

DigitalGate is the **platform operator**. Its internal operating environment is purpose-built for running the DigitalGate ecosystem — not for pretending to be a Real Estate agency, accommodation operator, or finance broker.

Industry Apps are **products DigitalGate sells**. They are not applications DigitalGate needs to run itself.

```
                    DIGITALGATE
                 PLATFORM OPERATOR
                         │
             ┌───────────┴───────────┐
             │                       │
       OPERATOR OS              PLATFORM CORE
             │                       │
    ┌────────┼────────┐              │
    │        │        │              │
 Commercial Partners Delivery    Customer Platform
    │        │        │              │
    └────────┼────────┘              │
             │                       │
       CUSTOMER ECOSYSTEM             │
             │                       │
      ┌──────┼──────┬──────┐         │
      ↓      ↓      ↓      ↓         ↓
     RE     PM    HOSP   FINANCE   SERVICES
```

---

## Two operating modes

### Customer organisation

Uses DigitalGate to **run their business**.

They get:

- Core
- Infrastructure
- Industry Apps (depends on their business)
- Growth Apps
- Intelligence
- Business Brain
- Digital Twin
- Command Centre (tenant — “what should I do today?”)

**Route:** `/dashboard` and installed Apps  
**Question:** *What is happening in my business and what should I do today?*

### DigitalGate (platform operator)

Uses the **Operator OS** to **run DigitalGate itself**.

DigitalGate does **not** need Real Estate, Accommodation, Services, Finance, Automotive, Health, etc. to operate the company.

Instead, DigitalGate staff get specialised operator capabilities:

| Domain | Examples |
|--------|----------|
| **Platform** | Organisations, users, tenants, subscriptions, apps, feature flags, configuration, system health |
| **Commercial** | MRR, ARR, subscriptions, billing, expansion, churn, CLV, revenue forecasting |
| **Sales** | Founding 10, Growth Engine, platform opportunities, pipeline, consultations |
| **Partners** | Resellers, referrals, commissions, partner performance |
| **Delivery** | Implementation, onboarding, projects, training, QA, go-live, handover |
| **Customer Intelligence** | Organisation health, adoption, usage, engagement, at-risk customers, expansion |
| **Platform Intelligence** | Connector health, automation health, API activity, errors, performance, AI usage |
| **Product** | Apps, roadmap, feature adoption, beta programmes, releases, feedback |
| **Support** | Support requests, knowledge base, escalations, customer issues |
| **Governance** | Audit log, permissions, security, compliance, platform policies |

**Route:** `/command/*`  
**Question:** *What is happening across DigitalGate, which organisations need attention, and what should the DigitalGate team do today?*

---

## Tenant boundary rule (hard)

The operator layer may read **aggregated customer signals** where authorised and necessary.

It must **never casually expose customer operational data**.

**Allowed (platform-wide):**

> Roe Realty — Health 82 — Active — 14 users — Real Estate App — 87% adoption

**Not allowed (without explicit org context + permission):**

> John Smith — $1.2m property — appraisal tomorrow — buyer details…

Staff enter a **specific organisation’s context** to see tenant operational detail. The Command Centre home shows ecosystem health, not guest check-ins or vendor pipelines mixed into platform pulse.

Implementation: `packages/platform-core/src/command-centre/overview.ts` — platform-owner aggregates only.

---

## Sidebar (staff)

When `showCommandCentre` is true, the side panel separates:

### DIGITALGATE

Operator OS — Command Centre, Organisations, Sales, Partners, Delivery, Customer Intelligence, Platform Intelligence, Commercial, Product, Support.

### PLATFORM

Tenant platform configuration — Apps, Marketplace, Network, Settings (Billing, Connectors, API, Audit), Roadmap, Platform Docs.

Customers continue to see **Platform Admin** (not DigitalGate Operator OS).

---

## Philosophy

> DigitalGate doesn’t need an Industry App because DigitalGate is the company that builds and operates the ecosystem of Industry Apps.

> Its own software should be the **control plane** for the entire DigitalGate ecosystem.

> Apps do the work. Intelligence understands the work. Command Centre tells the operator what matters.

Do not fragment into Support Centre, Audit Centre, Success Centre, etc. **Command Centre orchestrates** — dedicated Apps handle the work underneath.
