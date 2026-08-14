# DigitalGate Gen 2 — Business Advisor Briefing Pack

**Audience:** External Business Advisor (architecture / commercial / launch readiness)  
**Prepared for:** Ben (Platform Architect)  
**Date:** 14 August 2026 · **Advisor response adopted same day**  
**Repos:** Gen 2 (`dg-platform-web`) + marketing surfaces (`dg-platform`)  
**Companion:** [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md) · [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md) · [ROADMAP.md](../ROADMAP.md)

> **How to use this pack:** Sections **1–11** map 1:1 to the advisor’s original ask. Sections **A / B / C** are the three “if you only send three things” packages. **Live product screenshots are not embedded** — capture checklist is in §3 and §11 (login required).

---

## Advisor response — locked (Aug 2026)

Full assessment adopted into [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md) and [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md). Headline:

| Verdict | Detail |
|---------|--------|
| Architecture | Fundamentally sound — do not radical-change |
| Thesis | Strong — Intelligent Layer, not SaaS bundle |
| Biggest risk | Too many competing attentions before commercial proof |
| Next phase | **Make DigitalGate feel intelligent** (not “build more”) |
| Sell | Connected → understood → decide → act → learn → grow |
| Moat | Twin → Intelligence → Action → Learning |
| Elevate | Opportunity Engine · Customer Decision Intelligence · Twin visualisation |
| Proof wedge | DigitalGate for Real Estate first |
| Founding language | “Be among the first to operate on DigitalGate” — never “help us test” |
| Frameworks | Methodology **above** the platform, delivered through it |

---

## Executive frame (read first)

| Question | Honest position (Aug 2026) |
|----------|----------------------------|
| Architecturally right? | **Directionally yes** — multi-tenant Core + Universal Objects + Apps via Feature Registry + Event Bus + shared AI/Automation/Scoring/Connectors. North-star elevated to **Business Operating Platform / Intelligent Layer** (Twin + Decision Intelligence™). |
| Commercially differentiated? | **Thesis is strong**; **product depth is uneven**. Moat is Connect → Twin → Decision → Act → Learn — **not** “another CRM” or ServiceM8 clone. Risk = feature sprawl before founding dogfood. |
| Ready to launch publicly? | **No** — operating target is **Commercially Ready v1 / Founding Customer Programme**, not open SaaS launch. Public Gen 2 bar ≈ mid-60s%; CR-v1 filter ≈ mid-90s% of founding ship list with remaining detach / Domain / services depth blockers. |
| What to send the advisor first | This document + linked canon docs. Then a **15–20 min logged-in walkthrough** (or screenshot pack from §3). |

**Locked commercial milestone:** DigitalGate Founding 10 (public: Founding Customer Programme) — early access seats (indicative 3–5 RE + 2–5 other). Not “finish Gen 2.” Not “launch DigitalGate.”

---

# A — Architecture & data model

## 1. Platform architecture / technical blueprint

### Stack (as built)

```
Next.js apps/web (shell UI + API routes)
       ↓
packages/platform-core  (Auth session, Orgs, Apps registry, Billing hooks,
                         Memory, Twin, Scoring, Automation, Events, Commerce, …)
packages/database       (Prisma → PostgreSQL — Universal Objects)
packages/ui             (Design System)
       ↓
Connectors (WordPress, Stripe, Google GBP, Domain sandbox, Cotality sandbox, REA partner path, …)
       ↓
Universal Objects + Digital Twin™ snapshot (+ Knowledge Graph design)
```

### Canon docs (send these)

| Topic | Document |
|-------|----------|
| Platform blueprint | [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) |
| Gen 2 north-star brief | [architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) |
| Intelligent layer loop | [foundations/INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md) |
| App hierarchy | [foundations/APP-HIERARCHY.md](../foundations/APP-HIERARCHY.md) |
| Event Bus | [adr/0004-event-driven-architecture.md](../adr/0004-event-driven-architecture.md) · [catalogues/EVENT-CATALOGUE.md](../catalogues/EVENT-CATALOGUE.md) |
| Automation | Code: `packages/platform-core/src/automation/` (in-process rules; manifests declare triggers/actions) |
| AI Service | [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) |
| Twin | [adr/0006-digital-twin-concept.md](../adr/0006-digital-twin-concept.md) · `packages/platform-core/src/twin/` |
| Scoring / Opportunity | Roadmap + scoring modules; Opportunity remains Core ([ADR 0010](../adr/0010-opportunity-engine-remains-core.md)) |
| Connectors | [foundations/CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md) · [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) |
| Permissions / tenancy | Clerk orgs + Membership; Feature Registry ([ADR 0007](../adr/0007-feature-registry-permissions.md)); data scoped by `organisationId` |
| How apps talk to Core | App **manifest** registration (`packages/platform-core/src/apps/`) → routes/nav/features/entities/automation/aiTools; **no** direct cross-app PHP-style coupling — events + Core services |

### How Apps communicate with Core (implementation truth)

1. App declares a **manifest** (routes, nav, features, entities, automation triggers/actions, AI tools).  
2. Registry marks `enabled` (platform default) + per-org **AppInstallation**.  
3. UI lives under `src/app/(shell)/apps/<app>/…` and calls **API routes** that use platform-core modules.  
4. Side effects publish **platform events**; Automation Engine + Twin/scoring consumers subscribe.  
5. Licensing is **Feature Registry IDs**, not “App name string equals entitlement.”

---

## 2. Universal Objects / database schema

### Spec vs Prisma (honest)

| Advisor asked | Spec / product meaning | Prisma today | Notes |
|---------------|------------------------|--------------|-------|
| Organisation | Tenant | `Organisation` | Canonical tenant |
| Business | Business Profile on org | Org `settings` / Business Profile helpers | Not a separate table |
| User | Clerk user + Membership | `Membership` (+ Clerk) | No standalone User table |
| Contact | Universal person | `Contact` | Roles (Vendor/Buyer/Customer/Guest…) are tags/contexts — not separate people objects |
| Company | Universal org entity | `Company` | |
| Lead | Top-of-funnel | `Lead` | |
| Opportunity | Pipeline / deal-like | `Opportunity` | **No separate `Deal` model** — Opportunity is the deal object for now |
| Deal | Future / synonym | — | Prefer Opportunity; Demand→Deal chain is documented as future for Wantd |
| Customer | Role on Contact | — | Do not create Customer table |
| Property | RE / shared property | `Property` | Acc uses units; PM/Commercial add lease tables |
| Accommodation | Vertical | `AccommodationUnit`, guest profiles | |
| Booking | Acc stays | `StayBooking` | RE appraisal bookings exist in RE flows / WP |
| Quote / Invoice / Subscription | Commerce | `CommerceQuote`, `CommerceInvoice`, `CommerceSubscription` (+ payments/refunds) | Customer AR — not platform SaaS billing |
| Task / Activity | Core | `Task`, `Activity` | |
| Event | Domain events | Event catalogue + in-process bus | Not a persisted Event table in Prisma |
| Document | Universal docs | Spec’d; **schema Phase 1.5** | Soft gap vs CORE-OBJECT-SPEC |
| Services ops | Industry-owned | `ServiceJob` | Customers/quotes stay on Contact/Commerce |
| Finance / Commercial / PM floor | Domain start | `FinanceApplication`, `CommercialProperty`, `CommercialLease`, `PmLease` | Registry **enabled: false** until ready |

**Canon:** [CORE-OBJECT-SPECIFICATION.md](../foundations/CORE-OBJECT-SPECIFICATION.md) · [catalogues/OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md) · live schema: `packages/database/prisma/schema.prisma`

### Isolation risk (advisor question)

**Genuine universal foundation for CRM + Commerce + Activity/Task + Property + Acc bookings + ServiceJob.**  
**Industry floors** (Finance / Commercial / PM) are **new tables under Organisation**, intentionally thin — not separate products.  
**Watch-outs:** Document object lag; Deal naming; some WP Gen 1 data still dual-write until detach complete; Twin is snapshot/metrics today, not a full graph DB.

---

# B — Product (screens / modules)

## 3. Navigation + screen inventory

### Shell IA (current)

Primary customer shell: Overview, Business, Apps & Billing, Marketplace, Network, Settings (+ app-driven sidebar from enabled manifests).

**Target IA (locked, not fully ripped in shell yet):** BUSINESS / OPERATE / GROW / INTELLIGENCE / ECOSYSTEM — see [INTELLIGENT-LAYER.md](../foundations/INTELLIGENT-LAYER.md).

### Registry defaults (`packages/platform-core/src/apps/registry.ts`)

| Enabled by default | Disabled (scaffold / later) |
|--------------------|-----------------------------|
| CRM, Commerce, Websites, Infrastructure, Opportunities, Real Estate, Accommodation, Services, AI Visibility, SEO, Automation, Analytics, Social, Marketing, Reviews, AI Communications, Command Centre (staff) | Finance, Commercial, Property Management, Creator, Automotive |

### Capture checklist — customer paths

| Area | Path | Maturity (honest) |
|------|------|-------------------|
| Business Overview | `/dashboard` | Live |
| Business Profile / setup | `/dashboard/business`, `/dashboard/business-setup`, `/onboarding` | Live MVP |
| CRM | `/apps/crm`, contacts, opportunities, tasks | Live |
| Opportunities (core) | `/apps/opportunities`, `/command/opportunities` | Live (customer + staff) |
| Apps & Billing | `/dashboard/apps` | Live |
| Marketplace | `/dashboard/marketplace` | Scaffold / early |
| Network | `/dashboard/network` | Early |
| Digital Twin | Twin feeds scores/BI surfaces; **not** a single dedicated “Twin page” as product | Partial — centrepiece in architecture, UI still distributed |
| AI Visibility | `/apps/ai-visibility` | Live Growth |
| SEO | `/apps/seo`, `/apps/seo/audit` | Live Growth |
| Automation | `/apps/automation`, rules, logs | Live MVP |
| Analytics | `/apps/analytics`, dashboard, connectors | Live / deepening |
| Real Estate | `/apps/re/*` (properties, listings, vendor/buyer leads, …) | Strongest vertical |
| Accommodation | `/apps/accommodation/*` | Strong founding vertical |
| Services | `/apps/services/*` (jobs, scheduling, quotes, customers, teams) | Strategy locked; ops deepening |
| Commerce | `/apps/commerce`, products, subscriptions | Live |
| Reviews | `/apps/reviews`, inbox, requests | Overview / inbox MVP |
| Marketing / Social | `/apps/marketing/*`, `/apps/social/*` | Scaffold → early |
| Websites / Studio | `/apps/websites/*` | Live with Brand Studio entry |
| Infrastructure | `/apps/infrastructure/*` | Progressive |
| Finance / Commercial / PM | `/apps/finance/*`, `/apps/commercial/*`, `/apps/property-management/*` | Domain floor only; apps off by default |
| Settings | `/dashboard/settings`, team, connectors, roadmap | Live |
| Command Centre (staff) | `/command/*` — clients, growth-engine, advisor, revenue, intelligence, gate-1, … | Internal only (`dg:staff`) |

### Screenshots / video

**Not included in-repo.** Advisor ask §11 needs a logged-in session (Clerk). Recommended walkthrough order:

1. `/onboarding` → `/dashboard` → `/dashboard/business`  
2. `/dashboard/apps` → install story  
3. `/apps/crm` → opportunity → task  
4. `/apps/re` (or Acc / Services)  
5. `/apps/automation` → `/apps/ai-visibility`  
6. Staff: `/command` → client → advisor surface  

---

# C — Strategy / pricing / packaging

## 4. Pricing / packaging

### Public GTM lock (marketing + COMMERCIAL-MODEL)

| Layer | Price (AUD, indicative) |
|-------|-------------------------|
| Platform Starter | **$99/mo** |
| Platform Growth | **$249/mo** |
| Platform Scale | **$499/mo** |
| Enterprise | **Custom** |
| Industry Apps (RE, Acc, Services, …) | **+$99/mo** when commercially offered |
| Growth Apps | AI Visibility $99 · SEO $99 · Analytics $49 · Social $79 · AI Comms $99 (catalog) |
| Customer Success | Standard included · Priority **$199** · Success Partner **$499** |
| Professional Services | Optional (setup / migration from ~$997 one-time on pricing page) — never required |
| Seats | Starter 1 · Growth 5 · Scale/Enterprise unlimited (model) |
| AI | Token allowance + overage by tier |
| Intelligence / Twin / Automation | **Platform capabilities** — not sold as separate Apps (commercial lock) |

**Sources:** [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md) · live marketing `dg-platform/marketing/pages/pricing-page.html` · in-app Apps & Billing catalog (`pricing-catalog` / plans).

### Founding Customer Programme

- Public name: **Founding Customer Programme** (never “beta testers” on customer surfaces).  
- Internal: **DigitalGate Founding 10** — preferred pricing / priority onboarding / product input.  
- Mix: 3–5 RE + 2–5 other when Core is honest.  
- Exit: standard tiers after founding proof.

### Honesty gaps (advisor should know)

- Automation sometimes appears as a Growth App in catalog while packaging says platform capability.  
- Reputation vs Reviews naming drift.  
- Voice AI vs AI Communications naming.  
- Extra users / white-label stronger in Apps & Billing than on public page.  
- PM / Commercial Property / Property Development: **Coming / Later** on pricing — not founding promises.

---

## 5. Onboarding flow (after buy / signup)

**Implemented hub:** `/onboarding` — self-serve guided first-run (not “wait for agency”).

Intended journey:

```
Signup (Clerk) → Organisation provision
  → Name business (replace placeholder org name)
  → Business identify / profile (ABN / industry / brand where available)
  → Understand DigitalGate (first steps / progress)
  → Connect something (GBP, GSC, GA, Ads, Meta, Stripe, Xero, WordPress CTAs)
  → First value (CRM / Industry app / website / automation depending on template)
```

**Billing path (MVP built):** Subscribe → Stripe checkout → webhook → entitlements → Customer Portal.  
**Migration:** Professional Services / assisted import — not fully automated product yet.  
**Gate 1 dogfood orgs:** DG, Roe, CVH, Aëtherra, Wantd.

Details: [COMMERCIALLY-READY-V1.md](../foundations/COMMERCIALLY-READY-V1.md) dogfood journey · onboarding page implementation under `src/app/(shell)/onboarding/`.

---

## 6. Digital Twin™ specification

| Question | Answer |
|----------|--------|
| What is stored? | `DigitalTwinSnapshot`: brand, scores, metrics (contacts, leads, pipeline, tasks, connectors, commerce AR/MRR, reviews, …), connector/domain/website IDs, optional graph snapshot ref | 
| What does AI know? | Context Builder is designed to pull Twin + Universal Objects + Business Memory + Platform Knowledge — depth varies by surface |
| How updated? | Live build + capture snapshot services (`build-live-twin`, `capture-snapshot`) — incremental, not a full streaming graph yet |
| Entities connected? | Organisation-scoped aggregates over Core + installed app data + connectors |
| vs CRM? | CRM stores records; Twin is the **interpreted digital state** used for scores, briefing, recommendations |
| What can AI do? | Summarise, advise, recommend; **AI Actions** (approve→execute) are the north-star — partial today |

**Code:** `packages/platform-core/src/twin/`  
**Docs:** ADR 0006 · INTELLIGENT-LAYER §2  

---

## 7. AI Service specification

**Architecture:** App UI → AI Service (Platform Core) → Prompt Templates · Context Builder · Tool Registry · Model Router → providers.

Documented in [ai/AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md):

- Business Memory (structured org memory, not chat log)  
- Platform Knowledge Layer (docs + live tools — design/ops)  
- App-declared `aiTools` on manifests  
- Model router across OpenAI / Anthropic / Gemini (as configured)  
- Governance: see AI-GOVERNANCE / PLATFORM-INTELLIGENCE siblings  

**Maturity:** Embedded pattern is correct; **not** yet a full multi-agent OS. Command Centre “AI Business Advisor” is staff-facing analysis of client performance. Customer-facing Advisor / Daily Briefing exist as seeds to elevate into **Decision Intelligence™**.

---

## 8. Automation specification

**Phase 1:** In-process Event Bus + rule registry (`registerAutomationRule` / `runAutomationForEvent`).

- Apps declare triggers/actions on manifests.  
- Defaults cover CRM/RE intake-style paths and commerce (e.g. quote accepted, overdue invoices, payment notify).  
- Failure: per-rule try/catch → result `{ ok, error }` (logged; not yet a full dead-letter product UX).  
- UI: `/apps/automation` rules + logs.

**Example shape (illustrative of current pattern):**  
`lead.created` / opportunity follow-up → create task → notify → (SMS/email where wired).

**ADR:** 0004 Event-Driven Architecture. Durable queue (Inngest/BullMQ/SQS) deferred until scale needs it.

---

## 9. Real Estate specification

**Strongest vertical.** Closed-beta / founding reference: Roe-style AU agencies.

| Area | Status |
|------|--------|
| Vendor & buyer leads | Gen 2 pipelines + WP sync |
| Properties / appraisals / listings / offers / settlements | In product |
| Agents / team | Clerk memberships |
| Listing Hub / WP public capture | WP as public surface; Gen 2 operational SoT direction |
| REA | Partner platform wired (activate + REAXML upload path) — production smoke before promising |
| Domain | Sandbox MVP — not production portal promise |
| PMS connectors | Future — Property Management is a **separate Industry App** |
| Detach | Founding blockers remain on Roe SoT / WP auto-sync gated behind flags |

**Docs:** [RE-BETA-LAUNCH.md](../RE-BETA-LAUNCH.md) · [RE-BETA-PILOT-PACK.md](../RE-BETA-PILOT-PACK.md) · connectors REA/Domain/Cotality · [PROPERTY-ECOSYSTEM.md](../foundations/PROPERTY-ECOSYSTEM.md) (RE Sales vs PM vs Commercial vs Acc vs Development reserved).

**Compete vs agency platforms?** Positioning = intelligent operating layer + growth + Twin — **not** “replace every portal + trust accounting on day one.”

---

## 10. Services Engine specification

**Locked strategy:** One **Services** Industry App + **Service Templates** (trade configuration) — **not** 50 apps.

```
Platform Core (CRM, Commerce, Automation, AI, Comms, …)
        ↓
   Services App (Jobs, Scheduling, Field Ops, Templates)
        ↓
   ServiceJob (+ scheduling UX) — customers/quotes/invoices stay Universal
```

Templates configure terminology, job types, workflows — same OS for electricians, plumbers, cleaners, consultants, etc.

**Docs:** [SERVICES-APP.md](../foundations/SERVICES-APP.md) · [SERVICES-BETA-LAUNCH.md](../foundations/SERVICES-BETA-LAUNCH.md)  
**Code:** `ServiceJob` + `/apps/services/*`  
**Honesty:** Engine/templates depth still on founding backlog — do not oversell field-ops parity with ServiceM8 yet.

---

## 11. Actual product experience

Without embedded screenshots, the advisor should:

1. Read **A + B inventory** above.  
2. Watch a **recorded walkthrough** or live login (Ben).  
3. Judge UX/IA against Intelligent Layer IA target — current shell still app-centric.

Priority demo path: Overview → Business → CRM → Opportunity → Industry (RE or Acc) → Automation → Apps & Billing → (staff) Command Centre Advisor.

---

# Advisor “three packages” checklist

| Package | Contents in this repo | Gap |
|---------|----------------------|-----|
| **A. Architecture** | This §1–2 + PLATFORM-ARCHITECTURE + CORE-OBJECT-SPEC + schema.prisma + ADRs 0004/0006/0007 + AI-ARCHITECTURE + CONNECTOR-ENGINE | Event persistence / Document table / full graph Twin |
| **B. Product** | This §3 inventory + route list | **Screenshots/video** (capture required) |
| **C. Strategy** | This §4–5 + COMMERCIAL-MODEL + COMMERCIALLY-READY-V1 + pricing-page.html + DIGITALGATE-ROLLOUT | Founding offer SKU sheet (preferred discount %) if not yet written as a one-pager |

---

# What not to expand before founding proof

From Intelligent Layer + CR-v1 locks:

- Marketplace / Network depth as customer promise  
- Property Development product  
- Full Brand Studio AI, Social OAuth depth, Marketing campaigns  
- Goals UI / Universal Inbox / Voice depth / Business Brain corpus as blockers  
- Merging Commercial into PM, or Rentals as a separate brand from PM  

**Danger now:** feature sprawl — not missing features.

---

# Suggested advisor questions (optional)

1. Is Twin-as-centrepiece the right moat vs deepening one vertical to “agency system of record”?  
2. Is Founding 10 packaging priced to value, or under-asking for an OS narrative?  
3. Should Decision Intelligence ship as one surface before more Growth Apps?  
4. Where does DigitalGate stop vs professional services for migration?

---

**Document owner:** Platform Architect  
**Next update:** After screenshot pack attached or Gate 1 punch list closes.
