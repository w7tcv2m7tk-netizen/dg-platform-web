# DigitalGate — Execution Roadmap

**Version:** 2.1 — Foundations before implementation  
**Last updated:** August 2026  

> **Feature filter:** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer.
>
> **Market filter:** Ship for **Australia first**; keep schemas and Apps **Country Pack–ready** so NZ/UK/US don’t require a rebuild ([GLOBAL-READINESS.md](./foundations/GLOBAL-READINESS.md)).

> **Implementation gate:** Complete [foundations/CORE-OBJECT-SPECIFICATION.md](./foundations/CORE-OBJECT-SPECIFICATION.md) review and lock Platform 1.0 scope before expanding code. See [foundations/README.md](./foundations/README.md).

> **Architecture north-star:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) — Immediate Priority 1–15 are architectural foundations; do **not** boil the ocean on all 36 brief items ([ADR 0012](./adr/0012-gen-2-architecture-brief-adopted.md)).
>
> **GTM / rollout:** [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — Business Operating Platform; AU RE wedge → Founding Customers → Prospecting Engine ([ADR 0013](./adr/0013-gtm-rollout-strategy-adopted.md)). Engineering follows this roadmap; marketing follows that brief.
>
> **Commercialisation target:** [foundations/COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) — **Commercially Ready v1** (first ~10 paying businesses), Gates 1–4, 🔴 Commercial Core → 🟠 First Customer Value → 🟢 After Validation. Not “finish Gen 2.”

---

## North star (wow moment)

A new agency signs up, connects website + Google + Meta + Analytics + Stripe + email.

Within minutes the dashboard shows:

- **Business Health: 78/100**
- **AI Visibility Score™: 62/100**
- **17 opportunities** to improve visibility and vendor lead generation

That's the moment people remember. Every sprint should move toward this.

---

## What DigitalGate wins on

Not feature parity with HubSpot.

> **One platform to run, understand and grow your business.**  
> Category: AI-powered **Business Operating Platform** — not primarily a marketing platform.  
> Full GTM: [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md).

---

## Four workstreams (parallel, prioritised)

| # | Workstream | Priority | Status |
|---|------------|----------|--------|
| **1** | Platform Core | **Highest** | 🔄 In progress |
| **2** | Real Estate App (Roe) | High | ⏳ After Core stable |
| **3** | Competitive advantage (AI Visibility, Twin, BI) | Medium | 📐 Designed |
| **4** | Connectors ecosystem | Later | ⏳ After Core + RE |

**Stop inventing new customer Apps.** One exception: **Command Centre** (internal) — see below.

---

## Workstream 5 — Command Centre (internal, parallel)

**Not a customer App.** The OS DigitalGate uses to run DigitalGate.

| Phase | Scope |
|-------|-------|
| **Now** | Manifest, types, ADR, architecture doc ✅ |
| **Aug 2026 ops slice** | `/command` ops home (pulse, today’s actions, deep links), Client Intelligence signals, Platform Health (connectors/Stripe), Revenue + Refer & Earn snapshot ✅ |
| **Aug 2026 intelligence slice** | Success Score™ + Agency Health Ranking, AI Advisor, Growth Reports, Opportunity Engine, Benchmarking, Feature Flags UI ✅ |
| **Later** | Historical Twin score trends, auto-send Growth Reports, Support Centre |

Does **not** block Platform Core or Real Estate. Built on the same Twin + Scoring pipeline as the customer wow moment.

Full spec: [COMMAND-CENTRE.md](./COMMAND-CENTRE.md)

---

## Workstream 1 — Platform Core (honest status)

| Component | Scaffold | Production-ready |
|-----------|----------|------------------|
| Multi-tenancy (`organisation_id`) | ✅ Prisma schema | ❌ Not deployed |
| Organisations | ✅ Provision + Clerk webhook | ⚠️ Neon live ops still Ben |
| Users / Memberships | ✅ Schema + invite | ⚠️ Clerk → DB on sign-in / webhook |
| Roles & Permissions | ✅ Feature Registry + `requireFeature` | ⚠️ Role gate (owner/admin write); per-membership grants later |
| App Registry | ✅ Manifests + registry | ✅ |
| Universal Objects | ✅ Types + schema; Contact → App Role ([CONTACTS-AND-APP-ROLES](./foundations/CONTACTS-AND-APP-ROLES.md)) | ⚠️ Contact CRUD live; guests Contact-linked |
| Event Bus | ✅ In-process + CRM/referral producers | ✅ Fan-out → in-app Notifications |
| Platform API | ⚠️ Partial (`/portal/me` bridge) + Core CRUD | ⚠️ Expanding `/api/v1` |
| Billing | ⚠️ Stripe checkout + portal | ⚠️ Live checkout; monthly referral accrual on invoice.paid |
| **Refer & Earn** (Platform SaaS referrals) | ✅ MVP + P2 + Partner tiers + Connect cash | ✅ Credit on first paid + months 2–12; Customer 20% / Partner 25% / Reseller 30%; invite Resend/queue; cash via Stripe Connect Express (opt-in `STRIPE_CONNECT_ENABLED`) — [REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md) §A |
| Feature Flags | ✅ Org settings JSON + `/api/v1/org/feature-flags` | ⚠️ No Command UI yet |
| Audit Logs | ✅ Schema + write path | ⚠️ Partial coverage |
| Notifications | ✅ In-app bell + Notification model | ⚠️ Push/OS still planned (PWA Phase 2) |
| AI Assist | ✅ `/api/v1/ai/assist` | ✅ Real OpenAI/Anthropic when keyed; template fallback |

**Next:** AI on more CRM/RE workflows → Roe RE v0 depth → remaining Connectors reliability.

**Roadmap (planned):** **AI Brand Studio** — Core capability (not Logo Maker). Business Profile → logo / palette / type / favicon / guidelines with AI iteration; optional entry from Website Builder; writes brand into profile for Websites, Email, Docs. Spec: [foundations/BRAND-STUDIO.md](./foundations/BRAND-STUDIO.md). V1 stays small; expand asset packs after validation.

**Architecture locked (Aug 2026):** **Gen 2 Architecture & Product Considerations Brief** — canonical north-star constraints (§§1–36). Immediate Priority 1–15 = foundations filter. Does **not** authorize building everything. Spec: [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) · [ADR 0012](./adr/0012-gen-2-architecture-brief-adopted.md).

**Architecture locked (Aug 2026):** **Industry Intelligence** — Core capability (not “News”, not a standalone App initially). Pipeline: Collect → Filter → Understand → Personalise → Act. Industry Apps define feed profiles; consumers include AI Service, Universal Search, Reporting, Notifications, Opportunity Engine™ / Command Centre. Copyright: summarise/analyse + attribute — do not reproduce full articles. Phase 0 = docs; Phase 1 = RE curated briefing stub. Spec: [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md). **Do not build** a full news crawler/aggregator now.

**Architecture locked (Aug 2026):** **Platform Intelligence Layer** (Platform AI / Platform Knowledge) — foundational Gen 2 AI capability. Stack: DigitalGate AI → Platform Knowledge Layer (Documentation \| Live Platform \| Connectors) → Context/RAG → Model Router → Answer + Action Engine. Three knowledge levels: Platform / Business / Live. Super Admin AI ties to Command Centre (cite sources; 🟢/🟡/🔴 confidence). Product split: DigitalGate AI (your business) vs DigitalGate Platform AI (DigitalGate itself). Floating support chat stays thin UX — migrate onto this layer later, do not rip out. Phase 0 = docs + ADRs; Phase 1 = Super Admin RAG + citations; Phase 2 = org-scoped live tools; Phase 3 = diagnose + propose; Phase 4 = act-with-confirm. Spec: [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md). **Do not build** the full agent product now.

**Architecture locked (Aug 2026):** **Business Services** (Core capability) → customer **Business Setup / Start Your Business** (not Growth App, not “ASIC App”). Launch stages: **Identify → Register → Establish → Build → Connect → Grow**. Flow: DIGITALGATE → Business Identity → ABR (+ ASIC later) → Business Profile → Website/Email/CRM → SEO·AI Visibility/Automation/Analytics. **ABR** = verify/enrich (`SearchByABNv202001`, `SearchByASICv201408`; GUID server-only); **ASIC** = AU names/companies via DSP APIs (**hold** — apply to webservices@asic.gov.au; test env only after approval; no production submit / no scrape). Spec: [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md). Phase 1 = ABR Identify live-ish; next = Establish/Connect wiring (parallel to DSP application).

**Roadmap (planned):** **Services App** — one field-ops App (jobs, quotes, schedule, teams); industry via **Service Templates** (electrician, plumber, cleaner, …). Do not ship separate trade Apps. Spec: [foundations/SERVICES-APP.md](./foundations/SERVICES-APP.md).

**Shipped (Aug 2026 Core slice):** Platform Refer & Earn MVP (`/r/{code}`, Settings dashboard, invite email stub, first-paid credit); CRM lead create upserts Contact; Lead → Opportunity convert + CRM Opportunities list.

**Shipped (Aug 2026 Refer & Earn P2):** Stripe `invoice.paid` monthly referral credits (months 2–12, idempotent); invite delivery via Resend when `RESEND_API_KEY` set else branded Activity queue; cash payout threshold UI (ledger stub).

**Shipped (Aug 2026 Refer & Earn Connect cash):** Stripe Connect Express (AU) onboarding; transfer at ~A$100 threshold; Settings → Refer & Earn Connect status + request payout; webhooks for `account.updated` / transfer failure reversals; opt-in `STRIPE_CONNECT_ENABLED` (graceful UI when unset). Platform credit remains default.

**Shipped (Aug 2026 Refer & Earn ops):** Webhook setup script/docs register + update `invoice.paid` + Connect transfer events; Gen 2 route acknowledges unknown Stripe events; Commerce checklist reminds Ben to enable renewals event.

**Shipped (Aug 2026 Connectors):** Org WordPress connector host/key UX, `dgdev_` validation, CVH site-key requirement, Test connection probe without key rewrite; RE probe treats empty vendor inbox as connected (auth OK).

**Shipped (Aug 2026 AI on CRM):** Lead/opportunity/contact AI assist — draft follow-up + summarise (template generation from Business Profile + record context).

**Shipped (Aug 2026 Commerce):** AU tax invoices & quotes (Business Profile letterhead, GST 10%, print/PDF), quote→invoice, Commerce **Reports** (P&L, GST, Balance Sheet scaffold, Cash Flow). Core/commerce-adjacent — not Xero/MYOB; AU Country Pack tax conventions on Business Profile (`taxSettings`, `bankDetails`). Logo/icon on invoice & quote letterheads.

**Shipped (Aug 2026 Core completeness):** Real LLM router (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) behind `/api/v1/ai/assist` with template fallback; Partner/Reseller referral tiers; in-app Notifications from event bus; org feature flags API; CRM leads/opportunities feature gates; lead stage events; WP multi-site connector guidance.

**Shipped (Aug 2026 Network foundations):** Reputation Growth App MVP (`/apps/reviews` — Acc `dg_reviews` feed, Reputation Score™ when real data exists, AI themes LLM/stub, request queue after stay/settlement); Marketplace browse (`/dashboard/marketplace` — Software/Services/Professionals/Partners/Integrations); Business Referral Network scaffold on Contact (`/dashboard/network`) — Free/Reciprocal/Paid/Commission disclosed, separate from Platform Refer & Earn.

**Exit criteria:** Sign up → org in DB → create contact → timeline event — no wp-admin.

---

## Workstream 2 — Real Estate App (Roe flagship)

**One excellent App.** Full vendor workflow on Gen 2:

```
Vendor Lead → Appraisal → Listing → Marketing → Offers
    → Contract → Settlement → Past Client → Review → Referral
```

| Phase | Scope |
|-------|-------|
| **RE v0** | Vendor leads + pipeline (port from Gen 1) |
| **RE v1** | Listings + appraisals |
| **RE v2** | Full workflow above on Roe daily use |

Roe Realty = production tenant and case study. WP admin optional for agents.

---

## Workstream 3 — Competitive advantage

Build **after** Core is stable and RE v0 is flowing data.

| Priority | Capability |
|----------|------------|
| 1 | AI Visibility Engine™ + score |
| 2 | Digital Twin™ snapshot |
| 3 | BI Engine + recommended actions |
| 4 | Business Growth Score™ |
| 5 | AI Assistants (via AI Service) |

These are the moat — powered by **connected data**, not isolated features.

---

## Workstream 4 — Connectors (ecosystem)

**Canonical priority:** [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) — Tier 1–10, DigitalGate 15, immediate programme. APIs are not the product; DG is the intelligent layer.

**Immediate programme (Gen 2):** ABR · ASIC (DSP apply) · Dreamscape · Google · Stripe · REA · Domain · RP Data / CoreLogic.

After Core + RE v0 depth, expand along DG15 (Meta, Model Router providers, ElevenLabs/Twilio, Xero, Cloudflare) — not a scatter of fifty vendor Apps.

Each connector improves Twin, BI, and AI recommendations.

### WordPress detach (parallel to Core + RE)

ADR: [0002 — WordPress as Connector](./adr/0002-wordpress-as-connector.md).  
Executable tickets: **[WP-DETACH-BACKLOG.md](./WP-DETACH-BACKLOG.md)** (P0 guardrails → P1 Roe SoT → P2 portal/billing → P3 support+health → P4 CVH → P5 public/headless).

Value order: Roe ops independence before CVH booking engine before public sites. WP stays a connector for forms/public mirror/health probes — not Platform Core.

**Aug 2026 slice:** AccommodationUnit Neon SoT (soft) + HK Neon-first; Gen 2-first stay create behind `acc.gen2_first_booking`; Roe lead dual-write webhook (`dg-leads`) + optional stage write-back (`re.stage_writeback`). Plugin **v10.68.0**. Still WP: public book-now/Stripe guest pay, portal/support/health, RE appraisal form capture origin, headless CMS.

---

## Workstream 6 — Platform performance & PWA

Make the web app feel like desktop software before investing in native apps.

| Phase | Scope | Status |
|-------|-------|--------|
| **1 — Feel like software** | Request dedup, parallel fetch, skeletons, prefetch, PWA manifest | ✅ Done |
| **2 — PWA polish** | Service worker, offline shell, push notifications | 🔄 In progress |
| **3 — Mobile apps** | Industry-specific (RE, Accommodation, DG staff) | ⏳ Later |
| **4 — Desktop app** | Electron/Tauri when OS integration adds value | ⏳ Later |

Targets: dashboard < 2 s, navigation < 300 ms, CRM updates optimistic. Full spec: [standards/PERFORMANCE-STANDARDS.md](./standards/PERFORMANCE-STANDARDS.md).

---

## 24-month phases

| Phase | When | Focus | Commercial gate |
|-------|------|-------|-----------------|
| **1 — Foundation** | Now | Platform Core + RE App + Roe as tenant | **Gate 1** Internal Alpha |
| **2 — Validation** | +6 mo | 5–10 **founding** businesses (not unpaid QA), weekly feedback | **Gate 2** Founding Customer Programme |
| **3 — Commercial launch** | +12 mo | Public SaaS, billing, onboarding, support | **Gate 3** Public Launch (~10–20 active) |
| **4 — Expansion** | +18 mo | Accommodation, Finance, more Connectors · Country Packs ready | **Gate 4** Scale (50–100+) |
| **5 — DigitalGate Network** | +24 mo | Community · B2B partner graph · Marketplace · Reviews / Referrals · SDK / third-party Apps · enterprise · international communities | After validation (🟢) |

Operating target + honest gap status: [COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md).

**Phase 5 detail:** [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md). Gen 2 foundations scaffold (Reviews / Marketplace / B2B referrals) shipped Aug 2026; ship full Community when enough active businesses make the network useful.

**Referrals — two products:** (A) **Platform Refer & Earn** ships with / after Billing (Core) — customers refer DigitalGate. (B) **Business Referral Network** + **Reviews** — foundations scaffold live (`/apps/reviews`, `/dashboard/marketplace`, `/dashboard/network`); depth Phase 5+: [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md).

**Website Builder (MVP shipped):** AI Website Studio — Business Profile → structured page/component model → `/sites/[slug]` renderer + forms→CRM. WP migrate via Connector (separate). Domains/Hosting/SSL are **Infrastructure Core**, not Website Builder: [foundations/WEBSITE-BUILDER.md](./foundations/WEBSITE-BUILDER.md) · [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md).

**Infrastructure (Core Platform Service):** Provider-agnostic domains/DNS/hosting/SSL/**email** — **Dreamscape first** for domains/DNS/mailbox; **Resend** for transactional. Customer UX = DigitalGate Domains/Hosting/Email (never provider brand). **Sandbox only** for Dreamscape until automated tests pass. Email architecture: [EMAIL-INFRASTRUCTURE.md](./foundations/EMAIL-INFRASTRUCTURE.md). Domains MVP after Website Builder MVP.

**Execution priority until Phase 5:**

```
Core → CRM → Connectors → AI → Industry Apps → Intelligence → Scale
```

---

## Tomorrow morning (ordered)

1. **Provision Neon Postgres** — `DATABASE_URL` on Vercel + local  
2. **`npm run db:push`** — deploy schema  
3. **Clerk webhook live** — org + membership on signup  
4. **Platform API v0** — `POST/GET /api/contacts` (org-scoped, audited, emits `contact.created`)  
5. **CRM contacts UI** — list + create against Platform API (not WP)  

Do not start RE App port or AI Visibility until steps 1–4 are done.

---

## What we are NOT doing

- ❌ New Apps (Finance, Creator, etc.) until RE workflow proven  
- ❌ HubSpot feature checklist  
- ❌ Major Gen 1 WP modules  
- ❌ Features that fail the Core / RE filter  
- ❌ Full Community / social network before critical mass (foundations scaffold OK — see NETWORK-LAYER)  
- ❌ Paid/Commission B2B referral settlement / compliance packs before Country Pack gates (scaffold + disclosure UI OK — see REVIEWS-AND-REFERRALS)  
- ❌ MLM / multi-level on Platform Refer & Earn (single-level SaaS only)  
- ❌ Arbitrary AI PHP on Gen 2 Platform Core (WP stays Connector; native builder is structured model — see WEBSITE-BUILDER)  
- ❌ Fifty one-off vendor integrations / “Google Reviews App” / “ASIC App” — use Connector Layer + DigitalGate 15 ([CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md))  
- ❌ Full Industry Intelligence news crawler / article republisher (architecture + RE curated briefing later — [INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md))  

---

## Milestone tracker

| Milestone | Status |
|-----------|--------|
| app.digitalgate.com.au + Clerk | ✅ Done |
| Architecture IP (`docs/`) | ✅ Done |
| Platform Core scaffold | ✅ Done |
| Command Centre architecture | ✅ Done |
| **Platform foundations (15 docs)** | ✅ Done |
| **Commercially Ready v1 lock** | ✅ [COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) |
| **Gate 1 — Internal Alpha** | 🔄 Mostly ready (dogfood); ugly-list + ops env |
| Contact API + CRM UI | ✅ Contacts / opportunities live; Tasks still partial |
| Roe vendor leads on Gen 2 | 🔄 RE closed beta — WP capture still required |
| Billing checkout / Stripe hygiene | 🔄 Partial — pay path exists; SaaS UX thin |
| Wow moment dashboard | ⏳ Honest scores only |
| **Gate 2 — Founding customers (5–10)** | ⏳ Scoped pilot only — not full OS yet |
| **Commercially Ready v1 (launch statement)** | ⏳ Ben still glue for connectors / support / onboarding |

---

## Company (not just product)

As you grow, hats to plan for: Product · Engineering · Design · Customer Success · Sales · Marketing · Partnerships.

You wear several today — that's fine. Document so roles can split later.

---

## Related documents

- [docs/README.md](./README.md) — architecture IP index  
- [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — canonical GTM / rollout  
- [foundations/COMMERCIALLY-READY-V1.md](./foundations/COMMERCIALLY-READY-V1.md) — commercialisation operating target  
- [PRODUCT-VISION.md](./PRODUCT-VISION.md)  
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)  
