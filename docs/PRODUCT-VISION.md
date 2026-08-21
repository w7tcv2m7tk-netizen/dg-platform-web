# DigitalGate Platform Vision

**The Gateway to Your Digital World**

**Version:** 1.5  
**Last updated:** August 2026  
**Status:** Living document — evolves with the platform

**Architecture north-star:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) (§§1–36 + Immediate Priority 1–15 — constraints, not a build-all list)

**Operator experience (locked):** [foundations/OPERATOR-EXPERIENCE.md](./foundations/OPERATOR-EXPERIENCE.md) — *Simple for the operator. Powerful for the business. Intelligent underneath.*

**Connected Business philosophy (locked):** [foundations/CONNECTED-BUSINESS.md](./foundations/CONNECTED-BUSINESS.md) — *Connect your business. Give it a brain.* Sell coherence of a living system, not a feature checklist.

**GTM / rollout (canonical):** [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — Business Operating Platform; *One platform to run, understand and grow your business* ([ADR 0013](./adr/0013-gtm-rollout-strategy-adopted.md))

---

## The problem

Today's businesses operate across dozens of disconnected platforms:

- Website · CRM · Email marketing · Google Business Profile · Social media
- SEO · AI search · Analytics · Advertising · Forms · Calendars
- Documents · Reviews · Booking systems · Accounting · Customer communication

Each platform holds valuable information. **None of them tell the complete story.**

DigitalGate changes that.

Rather than replacing every tool, DigitalGate becomes the **intelligent layer** that connects them all into one unified ecosystem.

**One login. One dashboard. One source of truth. One intelligent platform.**

---

## Brand narrative — The Gate

The name **DigitalGate** is stronger than it first appears. The Gate is not just a logo — it is the **entry point to everything digital**.

| Outside the gate | The gate | Inside the gate |
|------------------|----------|-----------------|
| The fragmented digital world — websites, AI, social, ads, reviews, analytics, CRMs, countless disconnected tools | **DigitalGate** — where everything comes together | One intelligent platform that unifies data, automates workflows, provides AI-powered insights, and helps businesses grow |

That story is memorable, aligns with the product vision, and gives deeper meaning to the brand.

---

## Mission

To simplify the digital world for businesses by unifying their technology, data, and workflows into a single AI-powered platform that helps them **attract more customers**, **operate more efficiently**, and **make better decisions**.

---

## Vision

To become the **central operating system for every business's digital world** — where every website, customer, enquiry, marketing campaign, AI interaction, review, report, automation, and business application is connected through one intelligent platform.

DigitalGate is more than a CRM. More than marketing software. More than AI.

**It is the gateway to a business's digital world.**

### Internal principle (global OS)

> Every business deserves a single intelligent operating system that connects every digital tool, every customer interaction, and every business insight into one place.

That principle is as true for a plumber in Brisbane as for a real estate agency in London or a consultancy in Toronto. **Build the platform globally; win the first market in Australia.** See [foundations/GLOBAL-READINESS.md](./foundations/GLOBAL-READINESS.md) (Country Packs + GTM stages).

When someone buys DigitalGate they should not think “I’m buying a CRM.” They should think: **“This is where I run my business.”**

### Four interconnected layers (ecosystem)

| Layer | Promise |
|-------|---------|
| **1. Operating System** | Run your business. |
| **2. Intelligence** | Understand your business and tell you what to do. |
| **3. Network** | Connect you with people, businesses, and opportunities. |
| **4. Marketplace** | Buy software, services, integrations, and expertise. |

OS + Intelligence ship first. **Network and Marketplace are Phase 5** — design the foundation now (Organisation, User, industry, location, consent, permissions); do not build Community product until there is critical mass. Full spec: [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md).

**Two referral concepts (do not collapse):** (A) **Platform Refer & Earn** — customers refer DigitalGate SaaS; Core-adjacent with Billing — earlier. (B) **Business Referral Network** — businesses refer each other for jobs/leads; Phase 5+ with Reviews. Spec: [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md).

That progression takes *The Gateway to Your Digital World™* from strong SaaS positioning into an **ecosystem businesses operate within**.

---

## Philosophy

**Technology should work together.**

Businesses should not jump between twenty applications every day. Every system should communicate, share data, and contribute to a complete picture of the business.

DigitalGate is that central hub. The platform does not simply collect data — it:

- **Understands relationships** between customers, campaigns, and outcomes
- **Identifies opportunities** before they are missed
- **Automates repetitive work** so teams focus on what matters
- **Provides intelligent recommendations** — not just reports
- **Helps owners understand** what is happening and **what to do next**

---

## Platform loop (locked)

Every feature should support the Intelligent Layer loop — [foundations/INTELLIGENT-LAYER.md](./foundations/INTELLIGENT-LAYER.md).

**Customer proposition:** Your business. Connected, understood and automated.  
**Do not lead** with a collection of apps — apps are capabilities underneath.

```
CONNECT → CENTRALISE → UNDERSTAND → DECIDE → ACT → LEARN → GROW
```

Moat: **Digital Twin™ → Decision Intelligence™ → Action → Learning**

### 1. Connect

Connect every important business system via **Connectors** (not ad-hoc integrations).

Websites · CRM · Email · SMS · Google Business Profile · Social · Advertising · AI platforms · Payments · Booking · Accounting · Industry software · Internal apps

DigitalGate acts as the **integration layer** between them.

### 2. Centralise

Bring everything into **one source of truth**.

Every customer · interaction · document · lead · campaign · report — accessible from one place.

Implemented through **Universal Objects** and a **Universal Timeline** (see [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md)).

### 3. Understand

Digital Twin™ + scoring: living representation of the business. Data without context has limited value.

### 4. Decide

Decision Intelligence™ + Opportunity Engine: what happened → why → what matters → what next → can DigitalGate do it?

### 5. Act

Automation Engine + people + AI Actions (governed). Apps register triggers and actions — they do not build automation silos.

### 6. Learn

Measure outcomes and improve the next recommendation.

### 7. Grow

Every feature ultimately contributes to commercial growth — visibility, customer experience, efficiency, or decision-making.

**If a feature does not strengthen this loop — reconsider it.**

---

## (Legacy) Five-pillar shorthand

Older materials may still say Connect · Centralise · Understand · Automate · Grow. Map Automate → **Act**, and treat **Decide** + **Learn** as explicit stages in all new product/GTM writing.
## The dashboard

The dashboard is not simply a CRM view. It is a **Business Intelligence control centre**.

Business owners should immediately understand:

| Area | Examples |
|------|----------|
| **Health** | Business Health, Website Health, Automation Status |
| **Growth** | Pipeline, Revenue, Marketing Performance, SEO |
| **Visibility** | AI Visibility Score™, Reputation, Social |
| **Action** | Opportunities, Risks, Recommended Actions, Team Activity |

The dashboard answers one question:

> **"What should I focus on today to grow my business?"**

---

## Platform principles

| Principle | Meaning |
|-----------|---------|
| Connect systems | Connectors unify external tools |
| Simplify complexity | One login, one truth |
| Eliminate duplication | Universal Objects — no parallel data models; **one Contact**, app roles not duplicate people ([CONTACTS-AND-APP-ROLES](./foundations/CONTACTS-AND-APP-ROLES.md)) |
| Save time | Automation + AI assistance |
| Improve decision making | Insights, scores, recommendations |
| Increase visibility | SEO, AI Visibility, analytics in one place |
| Enhance customer experience | Unified timeline, faster follow-up |
| Automate repetitive work | Shared automation engine |
| Deliver measurable growth | Every feature ties to outcomes |

---

## Role of artificial intelligence

AI is **not a separate feature**. It is woven throughout the platform.

AI assists with: writing · analysis · recommendations · automation · reporting · forecasting · customer communication · lead qualification · content optimisation · business insights

The platform should feel **intelligent in every interaction** — via a shared **AI Service** with context from Universal Objects and the timeline, not isolated chatbots per App.

**Product split (locked):**

| Offering | Promise |
|----------|---------|
| **DigitalGate AI** | Ask about *your* business |
| **DigitalGate Platform AI** | Ask about *DigitalGate itself* (architecture, ops, fleet — staff Super Admin first) |

Both rest on the **Platform Intelligence Layer** (docs + live platform + connectors → RAG → Model Router → Answer + Action). Spec: [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md). Cohort network intelligence remains separate: [foundations/DIGITALGATE-INTELLIGENCE.md](./foundations/DIGITALGATE-INTELLIGENCE.md).

---

## What we are building (technical)

**DigitalGate Platform** — modular, multi-tenant SaaS (Next.js). We are **migrating** a platform, not starting from scratch.

| Generation | What it is | Status |
|------------|------------|--------|
| **Generation 1** | WordPress plugin (`dg-platform`) — Version 1 | **Production** — Roe, CVH, digitalgate.com.au |
| **Generation 2** | Cloud platform (`dg-platform-web`) — Version 2 | **Live** — app.digitalgate.com.au; Platform Core scaffolded |

Gen 1 is preserved IP and production. Gen 2 is the evolution — same product, modern substrate. WordPress becomes a **Connector**, not the foundation.

---

## Product ecosystem

| Offering | Role |
|----------|------|
| **DigitalGate Platform** | Flagship SaaS — Core, Apps, Connectors, AI, **Infrastructure** |
| **DigitalGate Growth** | Professional services delivered *using* the Platform |
| **DigitalGate Websites** | Design & build — connected via Connectors (Next.js, WordPress, Shopify, Webflow, …) |

**Infrastructure** is Core (domains, DNS, SSL, hosting abstraction, **email**, media) — provider adapters starting with Dreamscape (domains/DNS/mailbox) and Resend (transactional). It enables Digital Identity (`Profile → Domain → Website → GBP → Social → Email → Reviews → AI`) and Website Builder’s “Make it live” path. See [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md) and [foundations/EMAIL-INFRASTRUCTURE.md](./foundations/EMAIL-INFRASTRUCTURE.md).

---

## App taxonomy (what customers buy)

**Canonical order (locked):** [foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md) — **Core → Infrastructure → Industry → Growth**.

| Tier | Logic | Apps | Positioning |
|------|-------|------|-------------|
| **Core** | run | CRM, Contacts, Opportunities, Tasks, Calendar, Documents, Communications, Commerce | Always on — the business OS |
| **Infrastructure** | power | Websites / Builder, Domains, DNS, Hosting, Email, SSL, Website Management, Backups, Cloudflare | Operate digitally — progressive commercial readiness |
| **Industry Apps** | specialise | Real Estate, Accommodation, Services, Finance, Commercial, Automotive, Creator (+ future) | Vertical workflows on the same foundation — honesty on developing Apps |
| **Growth Apps** | grow | AI Visibility, SEO, Analytics, Social, AI Communications, Reviews, Prospecting / Opportunity Engine (where appropriate) | Visibility, acquisition, conversion |

**Across everything (not Apps):** AI · Automation · Event Bus · Digital Twin · Intelligence · Connectors.

The CRM is one App. SEO is one App. Real Estate is one App. **The Platform is what ties them together.** Automation is a **platform / Core-tier capability**, not a Growth App.

---

## Competitive positioning

**Category lock:** AI-powered **Business Operating Platform** — outcome: **One platform to run, understand and grow your business.** Not primarily a “marketing platform.” Full GTM: [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md).

Long-term competitors are platforms: **HubSpot, Odoo, Salesforce, Zoho** — not traditional agencies.

| Differentiator | Why it matters |
|----------------|----------------|
| **Gateway / OS positioning** | Connect + centralise — not another silo; run · understand · grow |
| **AI-first** | Shared AI Service with structured context |
| **AI Visibility Engine™** | Presence / SEO-style visibility today; live LLM citation monitoring is later — [SEO-AND-AI-VISIBILITY.md](./foundations/SEO-AND-AI-VISIBILITY.md) (no fake citation ranks) |
| **Scoring Engine** | One engine, many business health scores — honest signals only |
| **Industry Apps** | Real Estate first (Roe as live lab) |
| **Connector model** | Any CMS, any stack — not locked to WordPress |

---

## Long-term vision

DigitalGate should become more than software — the **Digital Operating System for Modern Businesses**, then an **ecosystem**: OS → Intelligence → Network → Marketplace.

Businesses no longer manage dozens of disconnected systems. DigitalGate becomes the intelligent gateway to their entire digital world — every website, customer, campaign, AI interaction, review, connector, automation, insight, partner, and decision flows through **one platform**.

The place where they **begin their day** · **monitor performance** · **manage customers** · **communicate** · **automate** · **make decisions** · **connect** · **grow**.

Rather than simply managing contacts, **DigitalGate manages the entire business** through the **Digital Twin™** — and eventually connects businesses to each other through Network and Marketplace.

---

## Success metrics (Generation 2)

| Milestone | Definition of done |
|-----------|-------------------|
| Platform Core live | Org + user + billing in Postgres |
| First Core App | CRM + timeline in Next.js |
| WordPress Connector | Leads/forms sync Gen 1 → Gen 2 |
| Intelligence dashboard | Scores + recommended actions on Overview |
| Roe on Gen 2 | RE App for daily agent workflow |
| Commercial pilot | Paying agency on Platform |

---

## Related documents

- [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) — canonical GTM / rollout
- [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md) — engineering constitution
- [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) — Core, Apps, Connectors, Twin, Graph
- [foundations/NETWORK-LAYER.md](./foundations/NETWORK-LAYER.md) — Community, B2B network, Marketplace (Phase 5)
- [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md) — Platform Refer & Earn (Core) vs Reviews + Business referrals (Phase 5+)
- [foundations/INFRASTRUCTURE.md](./foundations/INFRASTRUCTURE.md) — Core domains/DNS/SSL/hosting (Dreamscape first)
- [foundations/WEBSITE-BUILDER.md](./foundations/WEBSITE-BUILDER.md) — AI Website Studio (separate track; “Make it live” via Infrastructure)
- [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md) — Core industry feeds → briefing → Act (not “News”)
- [ROADMAP.md](./ROADMAP.md) — quarterly milestones
