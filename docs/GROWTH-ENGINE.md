# DigitalGate Growth Engine™

**The repeatable, AI-powered acquisition system inside Command Centre**

**Version:** 1.0  
**Last updated:** August 2026  
**Status:** Architecture defined — internal-only, builds on Scoring + Twin + Connectors  
**Parent:** [Command Centre](./COMMAND-CENTRE.md) (`command-centre` App, `/command/growth-engine/*`)

---

## What it is (and what it is not)

The **Growth Engine** is **not** a prospecting tool or a cold-outreach spreadsheet.

It is DigitalGate’s **internal acquisition operating system** — a connected pipeline that:

1. **Discovers** businesses worth talking to  
2. **Audits** their digital presence automatically  
3. **Demonstrates value** through branded interactive reports  
4. **Tracks engagement** without manual CRM entry  
5. **Follows up** with context and timing  
6. **Converts** accepted proposals into live platform tenants  

Customers never see the Growth Engine. DigitalGate staff use it inside **Command Centre**.

---

## Command Centre structure

```
Command Centre (internal App)
├── Platform Operations      → /command, /command/platform-health
├── Client Success           → /command/clients
├── Billing                  → /command/revenue
├── Support                  → /command/support
├── Product Analytics        → flags, audit, usage (future)
├── Growth Engine™           → /command/growth-engine/*
└── Executive Dashboard      → /command/reports
```

**Naming note:** The existing **Client Expansion** module (`/command/opportunities`) is for **upsell on live tenants**. Growth Engine is for **new business acquisition** — different lifecycle, same Twin/scoring pipeline underneath.

---

## End-to-end flow

```
Business Search
      ↓
AI Audit Engine™
      ↓
Interactive Opportunity Report
      ↓
Prospect Pipeline (auto CRM)
      ↓
Smart Follow-Up
      ↓
Proposal Generator
      ↓
Client Transition (org + subscription + onboarding)
      ↓
Customer Success → Renewal → Upsell → Referral
```

Every stage feeds the next. **No duplicate data entry** at conversion — prospect record becomes organisation, Twin, and dashboard.

---

## Module 1 — Business Discovery

**Core Platform capability** — see [foundations/BUSINESS-DISCOVERY.md](./foundations/BUSINESS-DISCOVERY.md).

| Layer | Status |
|-------|--------|
| Manual prospect book | Shipped (create / filter / archive) |
| Provider search + select-import | Shipped V1 (Google Places + ABN Lookup, env-gated) |
| Enrichment + industry audit packs | Packs + optional presence audit on import; deeper score breakdown continues |

Search filters:

| Filter | Examples |
|--------|----------|
| Industry / pack | Real estate, finance, trades, professional, accommodation, automotive |
| Location + radius | Currumbin / Gold Coast / Brisbane · 5–50 km |
| Business type | Agency, mortgage broker, builder, accountant |
| Keywords | Free-text name override |

**Example:** *Real estate agencies in Burleigh Waters* → select → Import → GrowthProspect (not CRM).

**Route:** `/apps/prospecting/discovery` (Business Discovery · Growth App)  
**Vendor / residential:** `/apps/re/vendor-prospecting` — see [foundations/PROSPECTING-ENGINE.md](./foundations/PROSPECTING-ENGINE.md)  
**APIs:** `POST /api/v1/command/growth/discovery/search` · `POST …/import`

---

## Module 2 — AI Audit Engine™

For each business, run automated analysis across the same dimensions customers eventually see on their dashboard:

| Domain | Checks |
|--------|--------|
| **Website** | Speed, mobile, UX, conversion gaps |
| **SEO** | Technical, metadata, content, internal links, schema |
| **AI Visibility™** | ChatGPT/Gemini/Perplexity readiness, entities, structured data |
| **Google Business Profile** | Completeness, reviews, posts, photos, categories |
| **Social** | Activity, engagement, consistency |
| **Digital identity** | Domain, SSL, DNS, email auth (SPF/DKIM/DMARC), connected assets |

**Output:** component scores + composite **Digital Business Health Score™** (prospect edition — same methodology as tenant scores, pre-platform).

**Route:** `/command/growth-engine/audits`

**Reuse:** Website Health connector, SEO App scanners, AI Visibility Engine, Scoring Engine — run in **prospect context** (no org_id yet).

---

## Module 3 — AI Opportunity Report

Not a static PDF — a **professionally branded interactive report** (shareable link + optional PDF export).

| Section | Purpose |
|---------|---------|
| Executive summary | Hook in 30 seconds |
| Business Health Score™ | Overall digital health |
| AI Visibility Score™ | AI-era discoverability |
| SEO Score™ | Search performance |
| Website health | Speed, mobile, UX highlights |
| Competitor comparison | Peer context |
| Top opportunities | Prioritised wins |
| Estimated growth potential | Quantified upside |
| Recommended actions | What to do next |
| How DigitalGate can help | Natural conversion path |

**Goal:** demonstrate tangible value **before** the first sales call.

**Route:** `/command/growth-engine/reports`

---

## Module 3b — Opportunity Engine™ (Daily Briefing)

**Who should I speak to today?** — see [foundations/OPPORTUNITY-ENGINE.md](./foundations/OPPORTUNITY-ENGINE.md).

Ranks GrowthProspects by **Prospect Opportunity Score** (audit gaps, stage, engagement, fit). Surfaces Daily Briefing on `/command/growth-engine` and Today’s Prospecting on `/command`. Extends Sales Assistant v0 — not an autonomous AI SDR.

## Module 4 — Prospect Pipeline

Automatic CRM — no manual entry when a report is generated.

```
Prospect → Audit Created → Report Sent → Email Opened → Viewed
    → Follow-up Due → Meeting Booked → Proposal → Client → Onboarding
```

| Stage | System behaviour |
|-------|------------------|
| Report generated | Create prospect + audit records |
| Report sent | Log outbound, start engagement tracking |
| Opened / viewed | Update pipeline stage, emit events |
| Meeting booked | Create task, notify owner |
| Proposal sent | Link commerce quote |
| Accepted | Trigger **Client Transition** (Module 10) |

**Route:** `/command/growth-engine/pipeline`

**Entities:** `Prospect`, `ProspectAudit`, `ProspectReport`, `ProspectEngagement`

---

## Module 5 — Smart Follow-Up

Event-driven nurture — the platform knows where every prospect sits.

| Signal | Action |
|--------|--------|
| Report not opened after 5 days | Send reminder email |
| Viewed report 3× | Notify account owner — high intent |
| Clicked pricing | Create follow-up task |
| Booked audit call | Advance to opportunity, prep briefing |

Powered by **Automation App** triggers on prospect events + **AI Communications** for outbound.

**Route:** `/command/growth-engine/follow-ups` (rules + queue)

---

## Module 6 — Call today (Sales Assistant v0)

Ranked “who should I speak to today?” list from Prospect Opportunity Score (audits, engagement, fit). **Not** an autonomous AI SDR — no auto-outreach.

> **“Who should I call today?”**

Surfaces Daily Briefing on `/command/growth-engine` and Today’s Prospecting on `/command`.

**Tool ID:** `command.growth.sales_assistant`  
**Context:** Pipeline stage, scores, engagement events, industry cohort

**Route:** embedded in Growth Engine hub (Daily Briefing)

---

## Module 7 — Benchmarking (prospect reports)

Peer comparison is a conversion lever:

| Metric | You | Industry avg | Top 10% |
|--------|-----|--------------|---------|
| Website speed | 58 | 81 | 94 |
| AI Visibility | 42 | 61 | 88 |

Uses anonymous cohort data from tenant network when available; industry priors when not.

**Reuse:** `BenchmarkComparison` types from Command Centre — prospect-facing slice in reports.

---

## Module 8 — Proposal Generator

One click after qualification:

**Generate Proposal** → AI produces:

- Cover letter  
- Executive summary  
- Recommended services (Apps + services)  
- Pricing (from Commerce / plan catalog)  
- ROI estimates  
- Timeline  

Branded, editable, send via Commerce quote/invoice flow.

**Route:** `/command/growth-engine/proposals`  
**Tool ID:** `command.growth.generate_proposal`

---

## Module 9 — Conversion Dashboard

Sales funnel metrics for leadership:

| Metric | Description |
|--------|-------------|
| Audits generated | Volume top of funnel |
| Reports sent | Outreach volume |
| Open rate | Email engagement |
| View rate | Report engagement |
| Meetings booked | Mid-funnel |
| Conversion rate | Prospect → client |
| MRR won | Revenue outcome |
| Avg sales cycle | Days prospect → client |
| Revenue forecast | Pipeline-weighted |

**Route:** `/command/growth-engine/conversions`

---

## Module 10 — Client Transition

When a deal is won — **zero re-keying** for identity:

```
Prospect won / Convert to org
      ↓
Organisation created or linked (Postgres)
      ↓
Apps installed from industry template (sidebar)
      ↓
Stage → onboarding · convertedOrganisationId set
      ↓
Staff admin seat (switch into client org)
      ↓
Website connected (Connectors — operator)
      ↓
Subscription / Twin (later — not invented here)
```

**Shipped (GE-8a):** `transitionGrowthProspectToClient` + `POST /api/v1/command/growth/prospects/[id]/transition` + Pipeline / Proposals / Reports / Conversions CTAs (“Create client org” / “Convert to org”). Carries business name, website, contact, industry/location into Business Profile. No Stripe subscription is created.

**Still planned:** contact invite as owner, subscription attribution (MRR), Twin snapshot.

Prospect history, audit, and report remain on the Growth prospect; `settings.growth.sourceProspectId` links the new org.

---

## Strategic moat

Most agencies: cold outreach + generic pitch.

DigitalGate:

1. Discover businesses systematically  
2. Analyse automatically with the **same engines** clients use post-sale  
3. Prove value with interactive reports  
4. Track engagement automatically  
5. Follow up with context  
6. Convert directly into the platform  

That is a **repeatable acquisition engine**, not a lead list.

---

## Build sequence

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| **GE-0** | Spec, types, manifest, routes (this doc) | Command Centre scaffold |
| **GE-1** | Business Discovery manual book + audit trigger | Postgres prospects |
| **GE-1b** | Provider search + select-import (Places / ABN) | BUSINESS-DISCOVERY.md |
| **GE-2** | AI Audit Engine (prospect mode) | Scoring v1, Website Health |
| **GE-3** | Interactive Opportunity Report | Report renderer, branding |
| **GE-4** | Prospect Pipeline + auto CRM | Postgres prospect models |
| **GE-5** | Engagement tracking + Smart Follow-Up | Automation, comms |
| **GE-6** | Call today (Sales Assistant v0) + Conversion Dashboard | Event bus; MRR won stays $0 |
| **GE-7** | Proposal Generator | Commerce quotes |
| **GE-8** | Client Transition automation | Platform 1.0 provisioning live |

**Does not block** Platform 1.0 or Real Estate. **Accelerates** once Twin + Scoring v1 exist — audits reuse production engines.

---

## Related documents

- [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — GTM Phase 3 (Prospecting Engine sells the platform)  
- [COMMAND-CENTRE.md](./COMMAND-CENTRE.md) — internal App shell  
- [COMMAND-CENTRE-BETA.md](./COMMAND-CENTRE-BETA.md) — staff closed-beta IN/OUT + demo path  
- [PRODUCT-VISION.md](./PRODUCT-VISION.md) — gateway + growth philosophy  
- [foundations/CUSTOMER-SUCCESS.md](./foundations/CUSTOMER-SUCCESS.md) — post-conversion  
- Types: `packages/platform-core/src/command-centre/growth-engine/types.ts`  
- Manifest: `packages/platform-core/src/apps/builtins/command-centre.ts`
