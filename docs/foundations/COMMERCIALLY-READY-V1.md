# Commercially Ready v1 — Operating Target

**Status:** Canonical · Commercialisation lock · August 2026  
**Source:** Platform Architect (Ben)  
**Milestone name:** **Commercially Ready v1** — not “finish Gen 2”

> **Target:** Ready for the first **10 paying businesses**, not a complete platform.  
> Aim: ~**70–80%** of the long-term vision; **90%+** of first-customer functionality.

**Sibling locks (do not contradict):**

| Lock | Path |
|------|------|
| GTM / positioning | [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) · [ADR 0013](../adr/0013-gtm-rollout-strategy-adopted.md) |
| Architecture north-star | [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) · [ADR 0012](../adr/0012-gen-2-architecture-brief-adopted.md) |
| Execution roadmap | [ROADMAP.md](../ROADMAP.md) |
| Commercial packaging | [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) |

Architecture Brief Immediate Priority 1–15 = **architectural foundations**.  
This document’s hierarchy 🔴/🟠/🟢 = **commercialisation build order** for paying customers. Both apply; when they conflict on *what to ship next*, this doc wins for customer-facing readiness.

---

## Launch statement (definition of done)

> A business can sign up, create its business, understand what DigitalGate recommends, connect existing digital assets, manage customers and opportunities, use AI and automation, see measurable BI, receive support, and pay us — **without Ben holding it together.**

If Ben is still the glue for onboarding, billing, connectors, or support — we are **not** Commercially Ready v1.

---

## Four gates

| Gate | Who | Intent | Marketing |
|------|-----|--------|-----------|
| **1 — Internal Alpha** | Ben + internal (DG, CVH, Aëtherra, Roe, Wantd) | Find ugly stuff; dogfood RE + Command | **No** major public marketing |
| **2 — Founding Customer Programme** | 5–10 businesses (3–5 RE, 2–3 SME, maybe Acc/Services) | Start marketing; one specific valuable workflow | Founding programme open |
| **3 — Public Launch** | ~10–20 active | Onboarding / billing / support / integrations / AI reliability + testimonials; know why buy / don’t | Public SaaS |
| **4 — Scale** | 50–100+ | Expand industry apps, white label, marketplace, etc. | Growth |

### Gate 2 founding workflow (RE wedge)

CRM + RE App + Website + AI Visibility + SEO + Command + automation — enough that a RE agency runs a **real** weekly workflow, not a demo tour.

### Gate 2 mix (indicative)

| Cohort | Count | Notes |
|--------|-------|-------|
| Real Estate | 3–5 | Flagship path (Roe + peers) |
| General SME | 2–3 | Core CRM + Profile + AI Vis without RE App |
| Acc / Services | 0–2 | Only if Core is stable and beta packs are honest |

---

## Scope bands

### Essential before serious marketing (Commercial Core)

Must be credible before Gate 2 marketing spends real money:

- Auth / orgs  
- Business switching  
- Business Profile  
- Core CRM  
- Contacts  
- Opportunities  
- Tasks / Activities  
- Command Centre  
- AI Service  
- Automation foundation  
- Billing / subscriptions  
- Support / KB  
- Onboarding  
- Permissions / security  
- Backup / monitoring / logging  

### Important — progressive (First Customer Value)

Start with Real Estate; deepen as founding customers need them:

- Website integration  
- AI Visibility  
- Reporting / intelligence  
- Industry Apps (**start Real Estate**)  
- REA (portal syndication)  
- Domain / hosting  

### Not required yet (After Validation)

Park until Gate 3+ / Scale:

- Social / community  
- Marketplace (full)  
- Every Industry App  

### Start NOW (even pre-product)

- Build audience / build-in-public narrative  
- Prospecting engine path (later acquisition OS):  
  **Business Discovery → Audit → Score → Report → Outreach → CRM**  
  Spec: [BUSINESS-DISCOVERY.md](./BUSINESS-DISCOVERY.md) · [OPPORTUNITY-ENGINE.md](./OPPORTUNITY-ENGINE.md) · [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)

---

## Dev hierarchy (commercialisation)

### 🔴 Commercial Core (1–14) — Gate 1 → Gate 2 blockers

| # | Capability | Gate intent |
|---|------------|-------------|
| 1 | Auth / organisations (Clerk, multi-tenant) | Sign up → org in DB |
| 2 | Business switching | Multi-business operators |
| 3 | Business Profile | Identity + recommendations context |
| 4 | Core CRM shell | One place to run customers |
| 5 | Contacts | Universal people SoT |
| 6 | Opportunities | Pipeline SoT |
| 7 | Tasks / Activities | Follow-through without Ben |
| 8 | Command Centre | DG runs DG; Growth Engine |
| 9 | AI Service | Assist + recommendations (honest) |
| 10 | Automation foundation | Event → durable rules → real actions |
| 11 | Billing / subscriptions | Checkout, portal, entitlements — pay us |
| 12 | Support / KB | Customer can self-serve + escalate |
| 13 | Onboarding | Guided path; not a redirect stub |
| 14 | Permissions + security + backup/monitoring/logging | Safe multi-seat; ops visibility |

### 🟠 First Customer Value (15–23) — Gate 2 RE / SME path

| # | Capability | Gate intent |
|---|------------|-------------|
| 15 | Website integration | Capture + presence (WP connector and/or Gen 2 sites) |
| 16 | AI Visibility | Honest presence / SEO-style score — no fake LLM ranks |
| 17 | Reporting / intelligence | Measurable BI the customer trusts |
| 18 | Real Estate App | Vendor/buyer/property workflow for founding RE |
| 19 | SEO (paired with AI Vis) | Fixes + recommendations |
| 20 | Domain / hosting (Infrastructure) | Domains + DNS + Email E1; hosting progressive |
| 21 | Portal syndication — Domain | Sandbox → Production when package allows |
| 22 | Portal syndication — REA | Partner-grant gated; fail closed until live |
| 23 | Property data — Cotality / GBP / Email depth | Enrich + reputation + deliverability |

### 🟢 After Validation (24–33) — Gate 3 / Scale

| # | Capability | Notes |
|---|------------|--------|
| 24 | Social / community | Network Layer Phase 5 |
| 25 | Marketplace (full third-party) | Scaffold ≠ product |
| 26 | Accommodation App depth | After RE founding proof |
| 27 | Services App depth | Templates, not separate trade Apps |
| 28 | Additional Industry Apps | Finance, Creator, Automotive, Commercial… |
| 29 | White labelling | Design now; enable later |
| 30 | Free public audit PLG | After honest audit surfaces solid |
| 31 | International GTM | Country Packs ready; market AU first |
| 32 | Full Platform Intelligence agent | Phases 2–4 after Knowledge foundations |
| 33 | Enterprise / marketplace economics | Scale gate |

---

## Honest gap assessment (Aug 2026)

Status key: **pass** · **partial** · **missing** · **parked**  
Evidence is code + beta/connector docs — not roadmap optimism.

### Essentials vs Gate 1 / Commercially Ready

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Auth / orgs | **pass** | Clerk + memberships + webhook path |
| 2 | Business switching | **pass** | Org switcher + active-org cookie |
| 3 | Business Profile | **pass** | Profile UI + ABR identity path |
| 4 | Core CRM | **partial** | Contacts / companies / opportunities / timeline live; Tasks not productized |
| 5 | Contacts | **pass** | CRUD + API + CRM UI |
| 6 | Opportunities | **pass** | Convert + stage + list |
| 7 | Tasks / Activities | **partial** | Activities + timeline yes; Task schema without API/UI |
| 8 | Command Centre | **pass** | Staff ops / Growth / health — Internal Alpha ready |
| 9 | AI Service | **partial** | Real LLM assist + fallback; metering / governance incomplete |
| 10 | Automation foundation | **partial** | Phase-1 in-process engine; UI “scaffold”; no durable org rules |
| 11 | Billing / subscriptions | **partial** | Checkout / portal / honest Stripe hygiene; SaaS subscription product UX still thin |
| 12 | Support / KB | **partial** | Chat/email + staff docs; customer KB thin |
| 13 | Onboarding | **partial** | Checklists / Business Setup; guided tour incomplete (`/onboarding` → business) |
| 14 | Permissions / security | **partial** | Tenant isolation + owner/admin; fine-grained RBAC later |
| 14b | Backup / monitoring / logging | **partial** | Audit log + Neon PITR policy; Sentry / monitoring UI not production |

### First Customer Value (RE path)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15 | Website integration | **partial** | WP connector + Gen 2 Website Builder beta; public capture still WP-dependent |
| 16 | AI Visibility | **partial** | Honest presence audit shipped; not live LLM citation monitoring |
| 17 | Reporting / intelligence | **partial** | Analytics KPIs, Commerce reports, RE reports, Command intel — not full BI product |
| 18 | Real Estate App | **pass** *(closed beta)* | Vendor/buyer/property paths; portal syndication OUT of beta promise |
| 19 | SEO | **partial** | Paired with AI Vis audit / fixes |
| 20 | Domain / hosting | **partial** | Domains + Email E1 beta; hosting/monitoring Apps OUT (placeholders) |
| 21 | Domain.com.au syndication | **partial** | Sandbox path; Primary `/v1/me` 403 → `DOMAIN_API_PATH_PREFIX=/sandbox`; Production package-gated |
| 22 | REA | **parked** | Scaffold, fail-closed Connect 503, publish `not_implemented` until partner grant |
| 23a | Cotality / CoreLogic | **partial** | Sandbox live (match / details / AVM); production cutover not claimed |
| 23b | GBP | **partial** | OAuth + sync; reply/insights not yet; Google allowlist/verification = ops gate |
| 23c | Email E1 | **pass** *(code)* | Prepare → auth DNS → verify via Resend; mailbox later |
| — | Billing Stripe hygiene | **pass** *(code)* | No invented customers/MRR; portal blocked without `billingCustomerId` |

### Parked / out of Commercially Ready v1

| Item | Status |
|------|--------|
| Social / community | **parked** |
| Full Marketplace | **parked** (browse scaffold ≠ marketplace product) |
| Every Industry App | **parked** |
| White label enablement | **parked** |
| Hosting marketplace / Infra Monitoring product | **parked** |

---

## Gate readiness verdict

### Gate 1 — Internal Alpha

**Verdict: mostly ready (dogfood), with honesty constraints.**

Internal orgs can run CRM + RE closed beta + Command Centre + Business Profile + org switch. Treat as alpha to **find ugly stuff**, not as a sales demo of “complete OS.”

Do **not** promise in alpha: REA publish, Automation builder depth, Task management, Infra Monitoring, or customer KB.

Operational gates (env correctness for Stripe / Dreamscape / Resend / Cotality sandbox / Domain `/sandbox` / WP plugin on dogfood sites) matter as much as code.

### Gate 2 — Founding Customer Programme

**Verdict: not yet Commercially Ready v1 — sell only as a scoped founding pilot.**

A founding RE offer can work **if** scoped to:

- Gen 2 CRM + RE App pipelines  
- Website (WP capture and/or Gen 2 sites)  
- AI Visibility / SEO (honest scores)  
- Domains + Email E1  
- Commerce payments where relevant  
- Command / automation **as available** (set expectations)

**Explicitly exclude or “coming”:** REA live publish, Domain Production portal publish without package, rich automation, full customer KB, hosting marketplace, fake AI citation ranks.

**Launch statement gap:** Ben is still holding glue for connectors, env, WP plugin, and support depth — so Gate 2 marketing should open only after the NOW backlog clears the worst glue.

### Gate 3 / 4

Not assessed as near-term. Requires Gate 2 retention evidence, testimonials, and “why buy / don’t” clarity.

---

## NOW engineering backlog (Gate 1 → Gate 2)

Ordered for the next founding-customer path — **not** a year-long wishlist.

| Pri | Item | Why |
|-----|------|-----|
| 1 | **Alpha dogfood pass** on DG / CVH / Roe / Wantd — punch list of ugly UX/ops | Gate 1 purpose |
| 2 | **Onboarding path that sticks** — signup → org → Profile → checklist → first connector (replace redirect stub) | Launch statement |
| 3 | **Billing end-to-end for a real seat** — checkout → webhook → entitlements → portal; SaaS status UI honest | Pay us without Ben |
| 4 | **Tasks API + CRM UI** (schema exists) | Essential #7 |
| 5 | **Automation: durable org rules + 2–3 real actions** (email/notify/stage) — retire “scaffold” for founding path | Gate 2 RE workflow |
| 6 | **Support baseline** — KB stubs for signup, billing, connectors, RE beta; escalate path that isn’t only Ben | Essential #12 |
| 7 | **Observability floor** — Sentry (or equivalent) + keep Monitoring placeholders honest | Essential #14b |
| 8 | **WP plugin deploy discipline** on founding sites + dual-write smoke | RE public capture still WP |
| 9 | **Domain.com.au** — confirm `/sandbox` for pilots; document Production gate; no fake “live on Domain” | Syndication honesty |
| 10 | **REA** — leave fail-closed; chase partner grant; implement only after docs | Don’t fake publish |
| 11 | **Cotality sandbox dogfood** on Roe properties → decide production cutover | RE valuation enrichment |
| 12 | **GBP** — exit Google testing allowlist / verification for founding orgs; reply later | Reputation path |
| 13 | **Email E1 smoke** on one founding domain (Prepare → DNS → Verify) | Infrastructure beta |
| 14 | **Permissions for multi-seat** — owner/admin/member clarity for founding agencies | Essential #14 |
| 15 | **Prospecting engine continuity** — Discovery → audit → score → report → CRM (staff) | Acquisition later; build narrative now |

---

## Suggested next 2 weeks (Ben)

1. **Week 1 — Gate 1 close:** Internal alpha dogfood on Roe + one other internal org; write the ugly list; fix blockers that stop daily use (auth/org switch, CRM, RE leads, Command). Confirm Stripe / Dreamscape / Resend / Domain sandbox env on Vercel.  
2. **Week 1–2 — Glue removal:** Ship onboarding that doesn’t dump to Profile only; one real paid checkout path; Tasks MVP; Support KB stubs for the five questions founders will ask.  
3. **Week 2 — Founding scope card:** One-pager per founding offer (RE vs SME) with IN / OUT lists matching this doc — especially REA parked, Domain sandbox, Automation partial.  
4. **Parallel (non-blocking):** Build-in-public narrative + Prospecting Engine staff usage; chase REA partner access; Cotality/GBP ops gates.

Do **not** spend these two weeks on Marketplace, community, white label, or new Industry Apps.

---

## Alignment with existing docs

| Doc | How this lock fits |
|-----|-------------------|
| [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) | GTM phases; this doc adds **readiness gates** + engineering hierarchy |
| [ROADMAP.md](../ROADMAP.md) | Execution workstreams; milestone tracker should reflect Commercially Ready v1 |
| [RE-BETA-LAUNCH.md](../RE-BETA-LAUNCH.md) | Gate 2 RE offer packaging |
| [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) | Plans / Feature Registry — packaging for “pay us” |
| Architecture Brief Immediate 1–15 | Foundations filter — continue; commercial order above decides *customer* ship sequence |

---

## Document control

| Field | Value |
|-------|--------|
| Owner | Founder & Platform Architect |
| Consumers | Ben, engineering agents, future team |
| Change process | Update this file when gate criteria or hierarchy shift; link from foundations README + ROADMAP |
| Anti-patterns | Fake green status · promising REA/Domain Production · calling scaffold “done” · marketing Gate 2 before launch statement holds |
