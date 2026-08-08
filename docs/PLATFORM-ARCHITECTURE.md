# DigitalGate — Platform Architecture

**The Gateway to Your Digital World — technical blueprint**

**Version:** 1.2  
**Last updated:** August 2026  
**Status:** Living document — evolves with the platform

> **Engineering constitution:** [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md) — all decisions must align.

---

## Overview

DigitalGate is the **intelligent layer** that connects, centralises, and acts on a business's entire digital presence. Long-term positioning: the **Digital Operating System for Modern Businesses**.

Architecturally, it is a **multi-tenant SaaS** built as:

```
Next.js (apps/web) + packages/ui (Design System)
       ↓
Platform Core (Auth, Orgs, Billing, Permissions, Memory, Identity, Assets, …)
       ├── Apps (manifest + Feature Registry)
       ├── Shared Services (AI, Scoring, BI Engine, Automation, Event Bus)
       └── Infrastructure (Core Platform Service — Domains/DNS/Hosting/SSL/Email)
              └── Provider Adapters (Dreamscape V1 → Cloudflare / Vercel / …)
       ↓
Connectors (WordPress, Shopify, Stripe, Google, …)
       ↓
Universal Objects + Knowledge Graph + Digital Twin™
       ↓
PostgreSQL
```

**Infrastructure detail:** [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md) — provider-agnostic Core; Dreamscape first; sandbox-first; customer never sees provider brand.
**Repository:** `dg-platform-web` (Generation 2) — evolving into monorepo layout.

---

## Five pillars → architecture mapping

| Pillar | Platform implementation |
|--------|-------------------------|
| **Connect** | Connectors (WordPress, Shopify, Stripe, Google, …) |
| **Centralise** | Universal Objects + Universal Timeline + single dashboard |
| **Understand** | AI Service + Scoring Engine + Reporting |
| **Automate** | Event Bus + Automation Engine |
| **Grow** | Growth Apps + intelligence dashboard + recommendations |

---

## Multi-tenant model

```
Platform
  └── Organisation (tenant)
        └── Workspace (optional — Sales, Marketing, Finance, …)
              └── Users (memberships + feature permissions)
                    └── App Installations
                          └── Data (scoped by organisation_id)
```

Every database query is scoped by `organisation_id`. Workspaces add optional sub-scoping for dashboards, teams, and permissions.

---

## Platform Core services (v1.2)

| Service | Responsibility | Code (scaffold) |
|---------|----------------|-----------------|
| Authentication | Clerk, sessions | middleware + webhooks |
| Organisations | Tenant CRUD | `packages/database`, `org/provision` |
| Workspaces | Subdivisions beneath org | `platform-core/workspace` |
| Feature Registry | Granular permissions e.g. `crm.contacts.read` | `platform-core/features` |
| Digital Twin™ | Complete digital state of the business | `platform-core/twin` |
| Knowledge Graph | Entity relationships | `platform-core/graph` |
| Digital Identity | Online presence profile | `platform-core/identity` |
| Asset Library | Logos, brand, templates | `platform-core/assets` |
| Business Memory | Structured org memory for AI | `platform-core/memory` |
| BI Engine | "What should I do next?" | `platform-core/intelligence` |
| AI Service | Prompts, context, tools, models | (Phase 2) |
| Scoring Engine | AI Visibility™, SEO™, etc. | `platform-core/scoring` |
| Event Bus | Domain events | `platform-core/events` |
| Automation | Triggers / actions | (Phase 2) |
| API Layer | Versioned Platform API | `/api/*`, future `/v1/*` |
| Audit Logs | Every write audited | (Phase 1) |

---

## Design System (`packages/ui`)

Single source of truth for UI. **Apps must not build one-off components unnecessarily.**

| Included (scaffold) | Planned |
|-------------------|---------|
| Design tokens (colour, radius, typography) | Forms, tables, charts |
| Button, Card | Icons, layouts, animations |

Import: `import { Button, Card, tokens } from "@dg/ui"`

---

## Digital Twin™

Every Organisation has a continuously updated **Digital Twin** — the complete digital state of the business:

Brand · Website · Domains · SEO · AI Visibility · Marketing · CRM · Pipeline · Revenue · Reviews · Connectors · Team activity · Automation · Documents · Assets

**Every score, recommendation, report, and AI insight is generated from the Twin** — not isolated app silos.

**Code:** `packages/platform-core/src/twin/`

---

## Digital Knowledge Graph

Objects are **connected**, not isolated records.

```
Business → Customers → Properties → Campaigns → Websites
    → Lead Sources → Tasks → Revenue → Reviews → AI Visibility
```

Enables richer reporting and AI context. Feeds Digital Twin and BI Engine.

**Code:** `packages/platform-core/src/graph/`

---

## Digital Identity

Central record of an organisation's **online presence**:

Domains · Websites · Email domains · Google Business Profile · Social profiles · Reviews · AI mentions · Structured data · Backlinks · Connected Connectors

**Code:** `packages/platform-core/src/identity/`

---

## Feature Registry

Beneath the App layer — granular capabilities for **licensing and permissions**.

```
CRM App
  → crm.contacts.read
  → crm.contacts.write
  → crm.contacts.export
  → crm.contacts.merge
  → crm.timeline.read
```

**Code:** `packages/platform-core/src/features/`

App manifests declare `features: string[]` referencing registry IDs.

---

## Business Memory Service

Structured **organisational memory** (not chat history):

Previous interactions · Writing style · Terminology · Reports · Campaigns · AI content · Decisions · Preferences · Prompts

All Apps access memory through the **AI Service**.

**Code:** `packages/platform-core/src/memory/`

---

## Business Intelligence Engine

| Reporting | Business Intelligence |
|-----------|----------------------|
| "What happened?" | **"What should I do next?"** |
| Historical charts | Recommended actions |
| Static dashboards | Insights with severity |

Examples: *AI Visibility declined 15%* → *Run visibility scan* · *Review response rate dropped* → *Reply to 3 reviews*

**Code:** `packages/platform-core/src/intelligence/`

---

## Asset Library

Shared brand assets for every App:

Logos · Colours · Fonts · Images · Videos · Documents · Templates · Marketing assets · Brand guidelines

**Code:** `packages/platform-core/src/assets/`

---

## Universal Objects

Formal object types. Apps **extend** these — they do not create parallel tables for the same concept.

### Identity

| Object | Description |
|--------|-------------|
| `Contact` | Person — customer, lead, vendor, buyer |
| `Company` | Organisation / account |
| `User` | Platform user (Clerk-backed membership) |
| `Organisation` | Tenant |

### Commercial

| Object | Description |
|--------|-------------|
| `Lead` | Pre-qualified interest |
| `Opportunity` | Pipeline stage / deal in progress |
| `Deal` | Closed-won commercial outcome |
| `Quote` | Proposed pricing |
| `Invoice` | Billing document |
| `Subscription` | Recurring plan (Stripe-backed) |

### Operational

| Object | Description |
|--------|-------------|
| `Task` | Action item |
| `Activity` | Timeline entry (polymorphic: any entity) |
| `Note` | Free-text annotation |
| `Document` | File reference |
| `Event` | Calendar event |

### Assets

| Object | Description |
|--------|-------------|
| `Property` | Real estate / commercial asset |
| `Accommodation` | Hospitality unit |
| `Vehicle` | Automotive |
| `Product` | Catalogue item |
| `Service` | Service offering |

**Code location (scaffold):** `packages/platform-core/src/objects/` + `packages/database/prisma/schema.prisma`

---

## App architecture

Every App **registers via manifest**. The platform reads manifests to build navigation, permissions, automation hooks, and AI tools.

### App tiers

| Tier | Visibility | Examples |
|------|------------|----------|
| `core` | customer | CRM, Tasks, Calendar, Contacts, Documents |
| `business` | customer | Real Estate, Accommodation, Finance, Services, Creator |
| `growth` | customer | SEO, AI Visibility, Marketing, Automation, Analytics, Reviews, Websites |
| `internal` | **internal** | **Command Centre** — DG staff only |

Customer dashboards use `AppRegistry.customerApps()`. DigitalGate staff use `commandCentreNavigation()` at `/command/*`.

See [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) for the internal intelligence layer.

### Manifest schema (TypeScript)

```typescript
interface AppManifest {
  id: string;                    // e.g. "real-estate"
  name: string;
  description: string;
  tier: "core" | "business" | "growth" | "internal";
  visibility?: "customer" | "internal";  // default: customer
  version: string;
  icon: string;
  routes: AppRoute[];
  navigation: AppNavItem[];
  permissions: AppPermission[];
  features: string[];            // Feature Registry IDs
  entities: string[];            // universal object types used
  automationTriggers: AutomationTriggerDef[];
  automationActions: AutomationActionDef[];
  aiTools: AiToolDef[];
  reports: ReportDef[];
}
```

**Code location:** `packages/platform-core/src/apps/manifest.ts`, `registry.ts`, `builtins/`

### App rules

1. Apps consume Platform Core services — never duplicate auth, billing, or org context.
2. Apps read/write Universal Objects through Platform API.
3. Apps emit events on state changes (`LeadCreated`, `PropertyListed`, …).
4. Apps register automation triggers/actions — they don't implement the engine.
5. Apps expose structured data for AI context — not raw DB access.

---

## API-first rule

```
App UI  →  Platform API  →  Core Service  →  Database
Connector  →  Platform API  →  Core Service  →  Database
Automation  →  Platform API  →  Core Service  →  Database
```

No App talks directly to the database except through Core repositories.

**Current bridge (transition):** Gen 1 WordPress `GET /portal/me` via `DG_API_KEY` until WordPress Connector syncs into Gen 2 Postgres.

---

## Event Bus

Every significant action produces a domain event.

Examples: `ContactCreated`, `LeadCreated`, `PropertyListed`, `BookingConfirmed`, `InvoicePaid`, `ReviewReceived`

Listeners (decoupled):

- Automation Engine
- Notifications
- Analytics
- AI context updates
- Reporting
- Connectors (outbound sync)

**Code location:** `packages/platform-core/src/events/`

```
Producer → EventBus.publish(event) → Subscriber(s)
```

Start with in-process bus; migrate to queue (Inngest, BullMQ, SQS) when scale requires.

---

## AI Service

Shared layer — Apps don't call OpenAI/Anthropic directly.

```
App requests AI action
       ↓
AI Service
  ├── Prompt Templates (per app, per action)
  ├── Context Builder (pulls universal objects + timeline)
  ├── Tool Registry (app-declared tools)
  └── Model Router (OpenAI, Anthropic, Gemini)
```

Example App requests: summarise contact, write follow-up email, suggest next actions, generate report narrative.

---

## Scoring Engine

One engine, many scores — cross-app IP.

| Score | Primary data sources |
|-------|---------------------|
| AI Visibility Score™ | AI Visibility App, Connectors |
| SEO Score™ | SEO App, Website Connector |
| Website Health Score™ | Site Tools, Connectors |
| Business Growth Score™ | CRM, Marketing, Analytics |
| Automation Score™ | Automation App |
| Conversion Score™ | CRM, Leads, Analytics |
| Reputation Score™ | Reviews App |

Apps **contribute data**; Scoring Engine **calculates**.

**Code location (scaffold):** `packages/platform-core/src/scoring/types.ts`

---

## Connectors

External systems sync **into** the Platform via Connectors — not ad-hoc integrations.

| Connector | Sync direction | Examples |
|-----------|----------------|----------|
| **WordPress** | WP → Platform | Forms, leads, SEO metrics, site health |
| **Shopify** | Shopify ↔ Platform | Products, orders, customers |
| **Stripe** | Stripe → Platform | Subscriptions, invoices, payments |
| **Google** | Google ↔ Platform | Analytics, Ads, Business Profile |
| **Xero** | Xero ↔ Platform | Invoices, contacts |
| **Webflow** | Webflow → Platform | Forms, CMS content |

Gen 1 WordPress plugin (`dg-platform`) becomes the **WordPress Connector** — slimmed over time to sync + site-specific rendering.

---

## Security

| Layer | Approach |
|-------|----------|
| Auth | Clerk (production: app.digitalgate.com.au) |
| Tenant isolation | `organisation_id` on every row; enforced in Core repositories |
| API | Server-side keys for Connectors; session for user APIs |
| Secrets | Vercel env vars; never in client bundle |
| Audit | All write operations logged with actor + org |

---

## Deployment

| Component | Host |
|-----------|------|
| apps/web (Next.js) | Vercel — app.digitalgate.com.au |
| PostgreSQL | Neon / Supabase / Vercel Postgres |
| File storage | Cloudflare R2 / S3 (future) |
| Gen 1 WP sites | Existing hosting (Roe, CVH, digitalgate.com.au) |
| Clerk | clerk.digitalgate.com.au |

---

## Repository layout (target)

```
dg-platform-web/
├── docs/
│   ├── PRODUCT-VISION.md
│   ├── PLATFORM-PRINCIPLES.md   # Engineering constitution (v1.2)
│   ├── PLATFORM-ARCHITECTURE.md
│   └── ROADMAP.md
├── packages/
│   ├── platform-core/           # Core types, apps, twin, graph, BI, features, …
│   ├── database/                # Prisma + Universal Objects
│   └── ui/                      # Design System (@dg/ui)
├── src/                         # Next.js (apps/web)
```

Future: extract `src/` → `apps/web/`, add `connectors/wordpress/` package.

---

## Generation 1 ↔ Generation 2 migration

| Gen 1 (WP) | Gen 2 (Platform) | Phase |
|------------|------------------|-------|
| dg_contacts | Contact | 1 |
| dg_organisations | Company + Organisation | 1 |
| dg_activities | Activity | 1 |
| Client portal (WP pages) | app.digitalgate.com.au | **Done** |
| portal/me REST | Platform API /portal/me | **Done** (bridge) |
| RE module | Real Estate App | 3 |
| SEO Pro | SEO Growth App | 2 |
| AI Visibility | AI Visibility Growth App | 2 |
| Full plugin | WordPress Connector | 2 |

---

## Related documents

- [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md) — engineering constitution
- [PRODUCT-VISION.md](./PRODUCT-VISION.md)
- [ROADMAP.md](./ROADMAP.md)
