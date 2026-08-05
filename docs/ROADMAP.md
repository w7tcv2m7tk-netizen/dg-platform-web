# DigitalGate — Execution Roadmap

**Version:** 2.1 — Foundations before implementation  
**Last updated:** August 2026  

> **Feature filter:** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer.

> **Implementation gate:** Complete [foundations/CORE-OBJECT-SPECIFICATION.md](./foundations/CORE-OBJECT-SPECIFICATION.md) review and lock Platform 1.0 scope before expanding code. See [foundations/README.md](./foundations/README.md).

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

> **Helping businesses understand, improve, and grow their entire digital presence through one AI-powered platform.**

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
| **After Core + Twin v1** | `/command` shell, Platform Overview, Client Intelligence |
| **After Scoring v1** | Success Score™, Agency Health Ranking |
| **Validation phase** | Growth Reports, AI Advisor, Opportunity Engine, Benchmarking |

Does **not** block Platform Core or Real Estate. Built on the same Twin + Scoring pipeline as the customer wow moment.

Full spec: [COMMAND-CENTRE.md](./COMMAND-CENTRE.md)

---

## Workstream 1 — Platform Core (honest status)

| Component | Scaffold | Production-ready |
|-----------|----------|------------------|
| Multi-tenancy (`organisation_id`) | ✅ Prisma schema | ❌ Not deployed |
| Organisations | ✅ Provision stub | ❌ Needs Neon + webhook |
| Users / Memberships | ✅ Schema | ❌ Clerk → DB not live |
| Roles & Permissions | ✅ Feature Registry types | ❌ Not enforced in API |
| App Registry | ✅ Manifests + registry | ✅ |
| Universal Objects | ✅ Types + schema | ❌ No CRUD API |
| Event Bus | ✅ In-process | ❌ No producers on writes |
| Platform API | ⚠️ Partial (`/portal/me` bridge) | ❌ No `/v1` CRUD |
| Billing | ❌ | ❌ |
| Feature Flags | ❌ | ❌ |
| Audit Logs | ❌ | ❌ |

**Next:** Postgres live → org on signup → Contact CRUD API → audit on write.

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

After Core + RE v0:

1. WordPress (Gen 1 → Platform sync)
2. Stripe
3. Google (GBP, Analytics)
4. Meta
5. Xero, Microsoft, Shopify — later

Each connector improves Twin, BI, and AI recommendations.

---

## 24-month phases

| Phase | When | Focus |
|-------|------|-------|
| **1 — Foundation** | Now | Platform Core + RE App + Roe as tenant |
| **2 — Validation** | +6 mo | 5–10 pilot agencies, weekly feedback |
| **3 — Commercial launch** | +12 mo | Public SaaS, billing, onboarding, support |
| **4 — Expansion** | +18 mo | Accommodation, Finance, more Connectors |
| **5 — Scale** | +24 mo | SDK, marketplace, enterprise, international |

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

---

## Milestone tracker

| Milestone | Status |
|-----------|--------|
| app.digitalgate.com.au + Clerk | ✅ Done |
| Architecture IP (`docs/`) | ✅ Done |
| Platform Core scaffold | ✅ Done |
| Command Centre architecture | ✅ Done |
| **Platform foundations (12 docs)** | ✅ Done |
| **Core Object Spec review** | ⏳ **Next — Ben** |
| **Postgres + org live** | ⏳ After spec lock |
| Contact API + CRM UI | ⏳ |
| Roe vendor leads on Gen 2 | ⏳ |
| Wow moment dashboard | ⏳ |
| 5–10 pilot agencies | ⏳ |

---

## Company (not just product)

As you grow, hats to plan for: Product · Engineering · Design · Customer Success · Sales · Marketing · Partnerships.

You wear several today — that's fine. Document so roles can split later.

---

## Related documents

- [docs/README.md](./README.md) — architecture IP index  
- [PRODUCT-VISION.md](./PRODUCT-VISION.md)  
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)  
