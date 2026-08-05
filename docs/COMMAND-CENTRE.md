# DigitalGate Command Centre

**The operating system DigitalGate uses to run DigitalGate**

**Version:** 1.0  
**Last updated:** August 2026  
**Status:** Architecture defined — implementation after Platform Core + tenant data

---

## What it is

The **DigitalGate Command Centre** is an **internal-only App** — not a super-admin panel bolted onto the product. It is the intelligence layer that powers how DigitalGate operates as a company:

- How account managers know who needs help
- How leadership tracks MRR, churn, and platform health
- How monthly client reports get written without manual work
- How upsell opportunities surface with evidence
- How AI advisors answer "How is Roe Realty performing?"

Customers never see the Command Centre. They see the **Business Dashboard** — scores, pipeline, recommended actions. The Command Centre sees **every tenant's Digital Twin** aggregated into operational intelligence.

---

## Two levels

### 1. Business Dashboard (customer)

Every organisation sees their own business:

| Area | Examples |
|------|----------|
| Scores | Business Health™, AI Visibility™, SEO™, Website Health |
| Operations | Leads, pipeline, revenue, reviews |
| Automation | Status, hours saved |
| Intelligence | Recommended actions, focus today |

**Route:** `/dashboard` and installed Apps  
**Audience:** Tenant users (Roe agents, CVH staff, etc.)

### 2. Command Centre (internal)

DigitalGate staff only:

| Module | Purpose |
|--------|---------|
| **Platform Overview** | Orgs, users, leads, AI actions, automations, platform health |
| **Client Intelligence** | Per-tenant scores, growth, conversion, ROI, usage, satisfaction |
| **Platform Health** | Infra, API/AI usage, email/SMS volume |
| **Revenue Intelligence** | Stripe MRR, ARR, churn, trial conversion |
| **Agency Health Ranking** | Top performers vs needs attention |
| **Opportunity Engine** | Upsell apps/services with estimated additional MRR |
| **Benchmarking** | Anonymous cohort comparison (e.g. Gold Coast agencies) |
| **Executive Reporting** | Auto-generated monthly DigitalGate Growth Reports |
| **AI Business Advisor** | Natural-language client performance analysis |
| **Support Centre** | Cross-tenant support context |
| **Feature Flags & Beta** | Rollout control |
| **Audit & Compliance** | Cross-tenant audit trail |

**Route:** `/command/*`  
**Audience:** DigitalGate staff (`dg:staff` role)

---

## DigitalGate Success Score™

One number every client understands. Computed by the **Scoring Engine** from the tenant's Digital Twin:

| Input | Weight (initial) |
|-------|------------------|
| Platform usage | High |
| AI Visibility Score™ | High |
| SEO Score™ | Medium |
| Website Health | Medium |
| Automation adoption | Medium |
| Reviews / reputation | Medium |
| Lead conversion | High |
| Growth trend | High |

Shown on the **customer dashboard** (simple) and **Command Centre** (full breakdown). Account managers use drops in Success Score as early warning signals.

---

## Wow moment → Command Centre loop

```
Connectors sync data
       ↓
Digital Twin updated per org
       ↓
Scoring Engine → Business Health, AI Visibility, Success Score
       ↓
BI Engine → recommended actions (customer dashboard)
       ↓
Command Centre aggregates → rankings, opportunities, reports
       ↓
AI writes monthly Growth Report → sent to client
       ↓
Client sees ROI → retention + upsell
```

The customer wow moment ("78 Business Health, 17 opportunities") and the internal Command Centre are **the same data pipeline**, different views.

---

## AI Business Advisor

Staff ask natural-language questions against a client's Twin + historical scores + events:

> "How is Roe Realty performing?"

AI responds with trends, wins, gaps, and quantified recommendations — backed by real platform data, not generic advice.

**Tool ID:** `command.client_advisor` (manifest)  
**Context:** Digital Twin snapshot, score history, BI insights, RE pipeline metrics

---

## DigitalGate Growth Report (monthly)

Auto-generated executive report per client. Example sections:

- New visitors, enquiries, appraisals, listings, estimated GCI
- Score changes (AI Visibility ↑12%, SEO ↑18%)
- Reviews gained, automation hours saved
- **Recommended next step** (AI-written, actionable)

No manual reporting. Account managers review before send, or auto-send when confidence is high.

**Report ID:** `command.client_growth_report`

---

## Agency Health Ranking

| Tier | Criteria (example) |
|------|-------------------|
| **Top performer** | Success Score ≥85, positive growth, high usage |
| **Healthy** | Success Score 70–84, stable metrics |
| **Needs attention** | Low usage, declining visibility, slow lead response, no reviews |

Surfaces in Command Centre morning view so the team knows where to focus.

---

## Opportunity Engine

Per client, based on Twin gaps and installed Apps:

```
Roe Realty — Opportunities
□ AI Visibility Pro      → +$297/mo
□ Reputation Management  → +$197/mo
□ Google Ads connector   → +$203/mo
Potential additional MRR: $697/mo
```

Turns platform intelligence into **evidence-based sales**, not guesswork.

---

## Benchmarking

With hundreds of tenants, anonymous cohort comparison becomes a retention moat:

| Metric | You | Cohort avg | Top 10% |
|--------|-----|------------|---------|
| AI Visibility | 87 | 64 | 92 |

Customers stay because they see how they compare — and how to improve.

---

## Architecture

```
                    ┌─────────────────────────┐
                    │  Command Centre App   │
                    │  (internal tier)        │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
  Scoring Engine          BI Engine              AI Service
        ↓                       ↓                       ↓
  Digital Twin (all orgs)   Event Bus          Business Memory
        ↓
  Platform API (cross-tenant, staff-scoped)
        ↓
  PostgreSQL
```

### App registration

| Property | Value |
|----------|-------|
| ID | `command-centre` |
| Tier | `internal` |
| Visibility | `internal` |
| Manifest | `packages/platform-core/src/apps/builtins/command-centre.ts` |

Customer app registry filters out `visibility: "internal"`. Command Centre navigation is a separate shell at `/command`.

### Access control

- Clerk role: `dg:staff` (or membership in DigitalGate internal org)
- Middleware gates `/command/*` — 404 or redirect for non-staff (not "access denied" leak)
- Platform API cross-tenant reads require staff scope + audit log every access
- **Principle:** staff see aggregated intelligence; PII access is logged and least-privilege

---

## Relationship to other Apps

| App | Relationship |
|-----|--------------|
| CRM, RE, SEO, AI Visibility | **Data sources** — feed Twin and scores |
| Scoring Engine | Computes Success Score and all trademark scores |
| BI Engine | Customer-facing insights; Command Centre consumes at scale |
| Connectors | More data → better intelligence for both levels |

The Command Centre does **not** duplicate CRM or RE UIs. Click a client → see intelligence summary → deep-link into tenant context if needed.

---

## Build sequence

| Phase | Deliverable |
|-------|-------------|
| **Now** | Manifest, types, ADR, docs (this document) |
| **After Core live** | `/command` shell + Platform Overview (org/user counts) |
| **After Twin + Scoring v1** | Client Intelligence + Success Score |
| **After 3+ tenants with data** | Benchmarking + Agency Health Ranking |
| **After AI Service v1** | Business Advisor + Growth Reports |
| **Validation phase** | Opportunity Engine + auto-report delivery |

**Does not block** Platform Core or Real Estate App. Built on the same foundation they create.

---

## Why this is the moat

Most SaaS companies build software for customers. DigitalGate also builds software that makes **DigitalGate's team** dramatically more effective:

- Every client interaction backed by real-time data
- AI-generated recommendations with measurable ROI
- Monthly proof of value → lower churn
- Natural upsell paths with numbers attached

Over time, the **data network effect** (more tenants → better benchmarks → better recommendations) becomes very hard to replicate.

---

## Related documents

- [ADR 0008 — Command Centre as internal App](./adr/0008-command-centre-internal-app.md)
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
- Manifest: `packages/platform-core/src/apps/builtins/command-centre.ts`
