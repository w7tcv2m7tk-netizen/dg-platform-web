# DigitalGate — Product Roadmap

**Version:** 1.2  
**Last updated:** August 2026  
**Status:** Living document — review quarterly

---

## North star

Every Q3–Q2 milestone serves one question for the dashboard:

> **"What should I focus on today to grow my business?"**

Pillars: **Connect → Centralise → Understand → Automate → Grow**

---

## Current state (August 2026)

| Area | Status |
|------|--------|
| Gen 1 WP plugin | v10.46+ — production on Roe, CVH, digitalgate.com.au |
| Gen 2 web app | Live at app.digitalgate.com.au — Clerk auth, dashboard shell |
| CRM bridge | Clerk → WP contact via `/portal/me` (transition) |
| Platform Core scaffold | Done — docs, registry, events, twin/graph types |
| Platform Principles (v1.2) | Done — PLATFORM-PRINCIPLES.md |
| Design System (`@dg/ui`) | Scaffold — tokens, Button, Card |
| Postgres / multi-tenant | Not yet in production |

---

## Q3 2026 — Platform Core (Phase 1)

**Goal:** Generation 2 has its own system of record. New signups get an Organisation in Postgres.

| # | Deliverable | Outcome |
|---|-------------|---------|
| 1.1 | **Postgres + Prisma** | Neon/Supabase provisioned; schema deployed |
| 1.2 | **Organisation on signup** | Clerk webhook → create org + membership |
| 1.3 | **Universal Objects v1** | Contact, Company, Activity in platform DB |
| 1.4 | **App registry** | Manifest system; CRM registered as first Core App |
| 1.5 | **Event bus (in-process)** | ContactCreated, etc.; automation stub listens |
| 1.6 | **CRM App (thin)** | Contacts list + detail + timeline in Next.js |
| 1.7 | **Dashboard v2** | Org name, installed apps, live checklist from Postgres |
| 1.8 | **Intelligence dashboard (v0)** | BI insights + "Focus today" from Digital Twin stub |
| 1.9 | **Feature Registry enforced** | Permissions check `crm.contacts.read` etc. |
| 1.10 | **Gen 1 bridge** | WP `/portal/me` + Contact sync |

**Exit criteria:** Sign up at app.digitalgate.com.au → org in DB → add contact in CRM App → see timeline — **without wp-admin**.

---

## Q4 2026 — Connectors + Growth Apps foundation (Phase 2)

**Goal:** WordPress feeds the platform; first Growth Apps scaffolded.

| # | Deliverable | Outcome |
|---|-------------|---------|
| 2.1 | **WordPress Connector v1** | Forms + leads sync to Platform API |
| 2.2 | **Stripe Connector** | Subscriptions tied to org (move off WP webhooks) |
| 2.3 | **Billing in Core** | Plan tiers, app licensing, billing portal link |
| 2.4 | **SEO App (MVP)** | On-page audit, basic score — port from SEO Pro concepts |
| 2.5 | **Scoring Engine v1** | SEO Score™ + Website Health Score™ |
| 2.6 | **AI Service v1** | Context builder + summarise contact |
| 2.7 | **Digital Twin v1** | Snapshot scores + metrics per org |
| 2.8 | **Knowledge Graph v1** | Contact ↔ Lead ↔ Property relationships |
| 2.9 | **Business Memory v1** | Structured memory for AI context |
| 2.10 | **BI Engine v1** | Recommended actions on dashboard |

**Exit criteria:** Roe website lead form → appears in Platform CRM within minutes.

---

## Q1 2027 — Real Estate App + AI Visibility (Phase 3)

**Goal:** Roe agents use the Platform daily for RE workflow.

| # | Deliverable | Outcome |
|---|-------------|---------|
| 3.1 | **Real Estate App** | Vendor leads, pipeline, appraisals — port from Gen 1 |
| 3.2 | **Property object** | Universal Property + RE extensions |
| 3.3 | **AI Visibility App MVP** | Citation tracking, AI Visibility Score™ |
| 3.4 | **Roe pilot** | 2–3 agents on Platform for daily pipeline work |
| 3.5 | **Marketing App (lite)** | Campaign list, contact segments |
| 3.6 | **Notifications** | Email alerts on lead assignment, task due |

**Exit criteria:** Roe vendor lead submitted on website → pipeline in RE App → agent notified — WP admin optional.

---

## Q2 2027 — Commercial pilot (Phase 4)

**Goal:** First paying external agency on Generation 2.

| # | Deliverable | Outcome |
|---|-------------|---------|
| 4.1 | **Self-serve signup + billing** | Plan picker → Stripe → org provisioned |
| 4.2 | **Onboarding in Platform** | Replace WP onboarding form for new SaaS clients |
| 4.3 | **Accommodation App (CVH)** | Bookings, housekeeping — port from Gen 1 |
| 4.4 | **Commercial RE App** | Extend RE for commercial property |
| 4.5 | **Partner agency pilot** | 1 non-Roe agency live on Platform |
| 4.6 | **SDK preview** | App manifest docs for third-party developers |

**Exit criteria:** External agency pays, onboarded, using CRM + RE App without DigitalGate hand-holding.

---

## 2027 H2+ — Scale (Phase 5)

| Area | Direction |
|------|-----------|
| **Industry Apps** | Finance, Services, Creator, Automotive |
| **Connectors** | Shopify, Webflow, Xero, Google Ads |
| **Scoring Engine** | Full Business Growth Score™, Reputation Score™ |
| **AI** | Multi-model, app-specific tools, report generation |
| **Event bus** | Move to durable queue (Inngest / SQS) |
| **Gen 1 sunset plan** | WP plugin → connector-only; no new module development |

---

## What we are NOT doing (explicit)

- ❌ Major new Gen 1 WP modules (bug fixes + connector endpoints only)
- ❌ Marketing the product as "a WordPress plugin"
- ❌ Per-app duplicate auth, billing, or contact tables
- ❌ Direct database access from App UI
- ❌ Feature parity with HubSpot before RE App ships

---

## Priority stack (when in doubt)

1. **Platform Core** — org, objects, API, events  
2. **CRM Core App** — proves the app model  
3. **WordPress Connector** — feeds Gen 2 from Gen 1 production  
4. **Real Estate App** — Roe revenue and proof  
5. **AI Visibility + Scoring** — differentiation  
6. Everything else  

---

## Milestone tracker

| Milestone | Target | Status |
|-----------|--------|--------|
| app.digitalgate.com.au live | Aug 2026 | ✅ Done |
| Clerk production auth | Aug 2026 | ✅ Done |
| Platform docs (vision, architecture, roadmap) | Aug 2026 | ✅ Done |
| Platform Principles (v1.2) | Aug 2026 | ✅ Done |
| Platform Core + UI scaffold | Aug 2026 | ✅ Done |
| Postgres + org on signup | Q3 2026 | ⏳ Planned |
| CRM App in Next.js | Q3 2026 | ⏳ Planned |
| WordPress Connector v1 | Q4 2026 | ⏳ Planned |
| Roe on RE App | Q1 2027 | ⏳ Planned |
| Commercial pilot | Q2 2027 | ⏳ Planned |

---

## Related documents

- [PRODUCT-VISION.md](./PRODUCT-VISION.md)
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)
