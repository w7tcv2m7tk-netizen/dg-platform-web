# DigitalGate Gen 2 — Architecture & Product Considerations Brief

**Status:** Canonical · Architecture locked · August 2026  
**Canonical path:** [`docs/architecture/GEN-2-ARCHITECTURE-BRIEF.md`](./GEN-2-ARCHITECTURE-BRIEF.md)  
**Source:** Platform Architect (Ben)  
**ADR:** [0012 — Architecture Brief adopted as Gen 2 north-star constraints](../adr/0012-gen-2-architecture-brief-adopted.md)  
**Applicable:** Generation 2 (`dg-platform-web`)

> **This document locks architecture and product *constraints*.**  
> It does **not** authorize building all 36 items. Ship Immediate Priority 1–15 foundations; Apps then accelerate without compromising the OS.

---

## Purpose

DigitalGate is evolving into an **AI-powered Business Operating Platform** rather than simply a CRM or marketing platform.

The architecture must therefore be designed for:

- Multi-business / multi-tenant operation
- International expansion
- Industry-specific Apps
- AI throughout the platform
- Third-party API / connectors
- Business infrastructure
- Websites and domains
- Communications
- Payments
- Business intelligence
- Prospecting and opportunity generation
- Future marketplace / ecosystem capabilities

**The priority is not to build every feature immediately.**  
**The priority is to ensure the underlying architecture does not prevent these capabilities from being added later.**

---

## Already locked elsewhere (do not duplicate)

| Topic | Canonical doc | Notes |
|-------|---------------|--------|
| Connector Priority / DigitalGate 15 | [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) | Build order + anti-priorities |
| Connector Engine contract | [CONNECTOR-ENGINE.md](../foundations/CONNECTOR-ENGINE.md) · [CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md) | Auth, sync, health |
| Business Services · Setup | [BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md) | Identify → … → Grow; ABR / ASIC hold |
| Platform Intelligence | [PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md) | Docs + live tools + citations |
| Industry Intelligence | [INDUSTRY-INTELLIGENCE.md](../foundations/INDUSTRY-INTELLIGENCE.md) | Feeds → briefing → Act; not “News” |
| Opportunity Engine™ | [OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md) · [ADR 0010](../adr/0010-opportunity-engine-remains-core.md) | Core; UI = Opportunities |
| Reputation hybrid | [ADR 0011](../adr/0011-reputation-core-plumbing-growth-app.md) · [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md) | Core Review UO + Growth App |
| Wantd | [WANTD.md](../WANTD.md) | Org on DG infra — not a DG App |
| Capability taxonomy | [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) | Core / Growth / Command / Business Apps |
| AI Service / Model Router | [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) | Shared AI, not per-App LLMs |
| Platform Principles | [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md) | Engineering constitution |
| Product vision | [PRODUCT-VISION.md](../PRODUCT-VISION.md) | Gateway narrative + pillars |
| GTM / rollout | [DIGITALGATE-ROLLOUT.md](../strategy/DIGITALGATE-ROLLOUT.md) · [ADR 0013](../adr/0013-gtm-rollout-strategy-adopted.md) | Business Operating Platform positioning; AU-first phases |

---

## Alignment notes (vs existing locks)

Honest reconciliation where Ben’s original brief wording and later locks differ:

| Brief topic | Brief wording | Locked interpretation |
|-------------|---------------|------------------------|
| **§1 Reputation** | Listed under Core “Reviews/Reputation” | **Both:** Core owns Universal Review Object + Reputation Service plumbing; customer surface is **Growth App Reputation** (`reviews` / `/apps/reviews`). See ADR 0011. |
| **§1 Growth Apps** | AI Visibility, SEO, Automation, Analytics, Social, AI Comms | **Plus Reputation** as Growth App packaging on Core Review plumbing. |
| **§1 Industry Intelligence** | Listed under Core | Unchanged — Core capability, not a “News” App. |
| **§9 Opportunity Engine** | Core | Unchanged — Core IP; Command Centre / Dashboard **orchestrate**, do not own. ADR 0010. |
| **§10 Prospecting** | Command Centre capability using Core objects | Matches [BUSINESS-DISCOVERY.md](../foundations/BUSINESS-DISCOVERY.md) — discovery engines feed Core Contacts/Companies; Command surfaces “who today”. |
| **§7 Super Admin AI** | Super Admin Command Centre | Productized as **Platform Intelligence** (Platform AI) in Command Centre — not cohort [DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md). |
| **§4 Business Identity** | Dedicated layer | Same as Business Services → Business Identity → Business Profile ([BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md)). |
| **§21 Wantd** | Independent Business/Organisation | Locked — org on DG infra; no Wantd App registry entry. |
| **Command vs Core** | Command must not become a dumping ground for Core | Unchanged — Command answers “what next?”; Core owns objects, engines, entitlements. |
| **§13 Reviews “initially Core”** | “not necessarily a standalone App” | Superseded by hybrid lock: Core plumbing **and** Growth App surface (MVP shipping). Do not re-litigate into Core-only UI. |

---

## 1. Establish a Clear Platform / Core / App Boundary

The distinction between Core, Business Apps, Growth Apps and Command Centre must remain clear.

### CORE

Capabilities fundamental to almost every business:

- Authentication · Organisations · Business Profiles · Users · Permissions · Billing
- CRM · Contacts · Companies · Opportunities · Tasks · Calendar · Activities · Documents
- Notifications · Commerce · Websites · Infrastructure · Search · Business Intelligence
- **Universal Review Object / Reputation Service** (plumbing — see §13)
- **Industry Intelligence**
- AI Service · Automation Engine · Event Bus · Universal Objects
- **Business Services** (Setup / Identity) — see locked BUSINESS-SETUP

### BUSINESS APPS

Vertical-specific functionality:

- Real Estate · Accommodation · Finance · Services · Automotive · Commercial · Creator / Personal Brand · future verticals

### GROWTH APPS

Optional specialist capabilities:

- **Reputation** (customer surface on Core Review plumbing)
- AI Visibility · SEO · Automation · Analytics · Social Management · AI Communications

### COMMAND CENTRE

Operational intelligence layer across the platform — **not** a dumping ground for Core functionality.

Primarily answers: **What should I do next?**

Surfaces: Opportunities · Prospecting targets · AI recommendations · Alerts · Business intelligence · Industry intelligence · Growth opportunities · Follow-ups · System issues · Platform Intelligence (Super Admin).

---

## 2. Universal Objects Must Remain Central

Continue developing Universal Objects rather than isolated App data models.

Core objects should include (non-exhaustive): Organisation · Business · User · Contact · Company · Lead · Opportunity · Deal · Task · Activity · Note · Document · Event · Property · Accommodation · Product · Service · Order · Invoice · Payment · Subscription · **Review** · Conversation · Message · Website · Domain · Integration · Campaign.

Industry Apps **extend** these objects; they do not duplicate them.

**Canonical detail:** [catalogues/OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md) · [ADR 0003](../adr/0003-universal-objects.md)

---

## 3. Build a Universal Connector Architecture

One of the highest-priority architectural decisions.

**Do not** build individual API integrations directly into Apps.

```
DigitalGate Core
       ↓
Connector Framework
       ↓
Google · Stripe · Dreamscape · ABR · ASIC · REA · Domain · RP Data/CoreLogic
Meta · Xero · WordPress · Cloudflare · ElevenLabs · Twilio · future providers
```

Every connector should support: Authentication · Credentials · Permissions · Connection status · Health · Rate limits · Errors · Logging · Webhooks · Sync status · Retry · Disconnect/reconnect · API versioning.

**Already locked:** build order and anti-priorities in [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) (DigitalGate 15). Do not re-prioritise ad hoc in Apps.

---

## 4. Business Identity Service

Dedicated Business Identity layer — authoritative DigitalGate representation of a business.

Combines: user-entered data · ABR · ASIC (when approved) · domain · Google Business Profile · social · categories · location · contacts · branding · logo · services · industry · hours · description.

Business Profile is a major source of truth for AI · Websites · SEO · AI Visibility · Social · CRM · Prospecting · Reporting · Discovery · Communications.

**Already locked:** [BUSINESS-SETUP.md](../foundations/BUSINESS-SETUP.md) · [BUSINESS-PROFILE.md](../foundations/BUSINESS-PROFILE.md)

---

## 5. AI Knowledge Architecture

Build the AI Knowledge Layer early. DigitalGate AI access:

| Level | Contents |
|-------|----------|
| **Platform Knowledge** | Architecture, developer/user docs, API, SOPs, FAQs, pricing, feature specs, ADRs, changelogs |
| **Business Knowledge** | Business Profile, CRM, Contacts, Opportunities, Apps, Integrations, Campaigns, Analytics |
| **Live Platform Knowledge** | Config, permissions, errors, logs, automation execution, integration status, health, deployments (where authorised) |

AI must distinguish: **Documented fact** · **Live platform fact** · **Inference** · **Unknown**. Prefer cited answers.

**Already locked:** [PLATFORM-INTELLIGENCE.md](../ai/PLATFORM-INTELLIGENCE.md)

---

## 6. AI Tool Registry

AI must not only retrieve documents. Authorised agents call platform functions via a Tool Registry, e.g.:

`search_documentation` · `search_codebase` · `get_business` · `get_user` · `get_subscription` · `get_app_status` · `get_integration_status` · `get_system_health` · `get_recent_errors` · `get_audit_log` · `get_automation` · `get_contact` · `get_opportunity` · `get_analytics` · `create_task` · `create_opportunity` · `send_message`

Tools inherit strict permissions. Trajectory: **Understand → Diagnose → Recommend → Act** (not Q&A only).

**Related:** [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · Platform Intelligence phases 1–4

---

## 7. Super Admin / DigitalGate Intelligence

Architecture for Super Admin operational view of the whole platform: businesses · users · MRR · churn · app adoption · API/system health · AI usage · performance · support · growth · client health · feature adoption.

**Super Admin AI** (natural language): client score drops · inactive customers · failing integrations · churn risk · successful Apps · last deployment changes.

**Naming:** This is **Platform Intelligence / Platform AI** — not cohort network intelligence ([DIGITALGATE-INTELLIGENCE.md](../foundations/DIGITALGATE-INTELLIGENCE.md)).

---

## 8. Client Intelligence & Reporting

Every business should eventually receive a DigitalGate-generated BI report explaining how the platform benefits them.

Example metrics: leads · opportunities · appointments · traffic · search / AI Visibility · SEO health · reviews · automation · response times · conversion · revenue (where available).

Major retention mechanism — architect for; do not boil the ocean now.

---

## 9. Opportunity Engine Core

Opportunity Engine™ remains a **Core** capability — industry-agnostic lifecycle.

Examples by vertical: RE vendor/buyer · Services job/quote · Finance loan · Accommodation booking · Wantd demand.

Industry Apps define context; **Core owns lifecycle**. Customer UI: **Opportunities**.

**Already locked:** [OPPORTUNITY-ENGINE.md](../foundations/OPPORTUNITY-ENGINE.md) · ADR 0010

---

## 10. Prospecting / Business Discovery (Command)

Prospecting as a **Command Centre** capability using **Core** objects.

Eventually: discovery by industry/location/size · website · contacts · social · Google · reviews · SEO · AI Visibility · website health · competitors.

AI recommends “Top 10 to contact today” with why / problem / service / opportunity / message.

Flow after contact: Prospect → Contact → Company → Opportunity → Pipeline.

**Related:** [BUSINESS-DISCOVERY.md](../foundations/BUSINESS-DISCOVERY.md) · [GROWTH-ENGINE.md](../GROWTH-ENGINE.md)

---

## 11. AI Audit Engine

Prospecting should generate: website · SEO · AI Visibility · GBP · review · competitor assessments · digital maturity score → personalised report.

Potential flow: Prospect discovered → AI Audit → Report → Sent → CRM → Follow-up automation → Opportunity.

Strong acquisition engine — **roadmap**; not Immediate Priority build-all.

---

## 12. Industry Intelligence Core

Core infrastructure: aggregate → AI filter / summarise / categorise / explain relevance / identify opportunities / recommend actions.

Categories: Industry · Local · Regulatory · Economic · Technology · Competitor · Market.

**Not** an RSS reader. Objective: **News → Intelligence → Opportunity → Action**.

**Already locked:** [INDUSTRY-INTELLIGENCE.md](../foundations/INDUSTRY-INTELLIGENCE.md) — copyright summarise+attribute; Phase 0 docs / Phase 1 RE briefing stub. No full crawler now.

---

## 13. Reputation / Reviews (Core UO + Growth App)

**Locked hybrid (ADR 0011):**

1. **Core** owns Universal Review Object, Reputation Service, connector-backed sources, aggregation, events/notifications, and Reputation Score™ **only when real connected data exists**.
2. **Growth App** (`reviews` / label **Reputation**) is the product surface: inbox, request queue, sources, honest empty states.
3. Platform Refer & Earn and Business Referral Network stay separate — do not blend into Reputation.
4. Reputation Pro (campaigns, AI respond UX, competitor analysis) remains roadmap.

Connectors (via Connector Layer): Google · Facebook · Trustpilot · TripAdvisor · ProductReview · Airbnb · Booking.com · future — **GBP first** per Connector Priority.

**Related:** [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md)

---

## 14. Website Builder (AI-native)

AI-native Website Builder using Business Profile · industry · services · location · brand · brief · SEO · AI Visibility requirements.

Generate: architecture · pages · HTML/CSS/JS · components · forms · schema · metadata · content — then deploy via Infrastructure layer.

**WordPress is one deployment option**, not the foundation ([ADR 0002](../adr/0002-wordpress-as-connector.md)).

**Related:** [WEBSITE-BUILDER.md](../foundations/WEBSITE-BUILDER.md) · [WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md)

---

## 15. Infrastructure Layer

First-class Core capability: domains · DNS · hosting · SSL · CDN · SMTP · transactional email · backups · monitoring · security · performance · deployment.

**Dreamscape** and **Cloudflare** via Connector Layer — not hard-coded into the Website App.

**Related:** [INFRASTRUCTURE.md](../foundations/INFRASTRUCTURE.md) · Connector Priority

---

## 16. Business Email (provider layer)

```
DigitalGate → Email Provider Layer → Google Workspace · Microsoft 365 · SMTP · future
```

DigitalGate manages configuration and provisioning — does **not** become an email provider.

**Related:** [EMAIL-INFRASTRUCTURE.md](../foundations/EMAIL-INFRASTRUCTURE.md)

---

## 17. Universal Payments (+ crypto via provider)

Core: card · bank · subscriptions · invoices · payment links · refunds · deposits · payouts.

Stripe = initial primary provider. Crypto via compliant external provider (e.g. Coinbase Commerce) — **not** building crypto rails internally.

**Related:** [commerce/COMMERCE-SPECIFICATION.md](../commerce/COMMERCE-SPECIFICATION.md) · Connector Priority anti-priorities

---

## 18. AI Communications

Connect: Email · SMS · WhatsApp · Voice · Website chat.

Agent context: CRM · Knowledge · Business Profile · Calendar · Opportunities · Automation · Apps.

Providers (ElevenLabs, Twilio, …) sit under DigitalGate’s architecture.

**DigitalGate owns the Agent. Providers supply infrastructure.**

**Related:** [COMMUNICATIONS-ARCHITECTURE.md](../ai/COMMUNICATIONS-ARCHITECTURE.md)

---

## 19. Social / Community (roadmap — don’t distract)

Keep on roadmap: Business Network · Community · referrals · recommendations · partner marketplace · education · discussions.

Ecosystem layer later — **not** another basic social feed now. Do not let this distract from Core.

**Related:** [NETWORK-LAYER.md](../foundations/NETWORK-LAYER.md)

---

## 20. Referrals / Marketplace

Architect early for: user / business / partner referrals · App marketplace · service providers · commission · attribution · revenue share.

Affects billing, attribution, and organisation relationships.

**Related:** [APP-MARKETPLACE.md](../foundations/APP-MARKETPLACE.md) · [REVIEWS-AND-REFERRALS.md](../foundations/REVIEWS-AND-REFERRALS.md) · [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md)

---

## 21. Wantd (org on DG infra)

Wantd remains an independent **Business / Organisation** using DigitalGate infrastructure.

MVP: Contact → Opportunity / Want → Matching → Automation → Supplier opportunity.

**Do not** build a separate technology stack yet. Dedicated marketplace only if validated.

**Already locked:** [WANTD.md](../WANTD.md)

---

## 22. Mobile & Desktop

Responsive web first → **PWA** → native when usage validates.

PWA: installable · push · fast launch · offline where appropriate.

Performance is an architectural concern now: fast navigation · SSR where appropriate · code splitting · caching · background jobs · optimised APIs · DB indexing · CDN · async processing.

**Related:** [PWA.md](../PWA.md) · [PERFORMANCE-STANDARDS.md](../standards/PERFORMANCE-STANDARDS.md)

---

## 23. Global Search (Core)

One search across Contacts · Companies · Opportunities · Tasks · Documents · Properties · Reviews · Conversations · Websites · Knowledge · Businesses.

Eventually NL: “Find all opportunities related to Currumbin Valley.” AI search sits above conventional search.

---

## 24. Notifications (universal)

Channels: In-app · Email · SMS · Push · WhatsApp · Voice — same notification / event infrastructure.

---

## 25. Event-Driven Architecture

Continue investing in the Event Bus. Everything important emits events, e.g.:

`contact.created` · `lead.created` · `opportunity.created` · `payment.received` · `review.received` · `website.published` · `domain.registered` · `integration.connected` · `automation.completed` · `ai.audit.completed` · `listing.published` · `booking.created`

Foundation for automation and AI.

**Related:** [ADR 0004](../adr/0004-event-driven-architecture.md) · [EVENT-CATALOGUE.md](../catalogues/EVENT-CATALOGUE.md)

---

## 26. Audit Log

Immutable audit early: user · AI · API · automation · config · billing · permissions · integrations.

Essential for support · security · AI diagnosis · compliance · enterprise · debugging.

---

## 27. AI Safety & Permissions

Never grant AI blanket access because the user asked. Tools inherit the user’s permissions; Super Admin broader; client restricted. Log AI actions; confirm high-risk.

| Action class | Default |
|--------------|---------|
| Read data | Potentially automatic |
| Create task | Automatic |
| Send email | Configurable |
| Delete data / change billing / register domain / publish website | Confirmation |

**Related:** [AI-GOVERNANCE.md](../foundations/AI-GOVERNANCE.md) · Platform Intelligence act-with-confirm phases

---

## 28. Versioning & Documentation

Formal docs system: architecture · product specs · API · user · developer · SOPs · troubleshooting · changelog · ADRs.

Every major feature: documentation before or alongside implementation. Docs feed DigitalGate AI (Platform Knowledge).

**This brief is part of that system.** Index: [docs/README.md](../README.md)

---

## 29. Internationalisation

Avoid hard-coding Australia into Core. Configurable: currency · tax · business identifiers · addresses · phones · date/time · regulatory · registration systems · payment providers · domain TLDs · accounting.

Australia = first Country Pack implementation — not permanent architecture.

**Related:** [GLOBAL-READINESS.md](../foundations/GLOBAL-READINESS.md)

---

## 30. Data Residency & Privacy

Plan for: tenant isolation · encryption · secrets · RBAC · retention · export · deletion · consent · audit · privacy controls · AI data controls · API credential isolation.

**Related:** [DATA-GOVERNANCE.md](../foundations/DATA-GOVERNANCE.md) · [SECURITY-STANDARDS.md](../standards/SECURITY-STANDARDS.md)

---

## 31. AI Observability

Track: requests · model · cost · latency · tokens · tool calls · errors · user feedback · answer quality · citations.

Economics and performance of the AI layer.

**Related:** [OBSERVABILITY.md](../foundations/OBSERVABILITY.md)

---

## 32. AI Model Independence / Model Router

Maintain Model Router: OpenAI · Anthropic · Google Gemini · future.

**Do not** build the platform around one model provider. Apps never call LLMs directly.

**Related:** [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · Connector Priority (Model Router in DG15)

---

## 33. Billing Architecture (Entitlements)

Avoid hard-coding pricing into Apps.

Central **Entitlements + Billing Engine**: plan · users · Apps · add-ons · usage · limits · features · credits.

Pricing changes without rewriting application logic.

**Related:** [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md) · [ADR 0007](../adr/0007-feature-registry-permissions.md)

---

## 34. Usage-Based Billing (architect for)

Even if not launched immediately, architect for usage: AI tokens · audits · voice minutes · SMS · emails · API calls · website generation · storage · domains · hosting.

Critical as AI becomes a major cost centre.

---

## 35. Platform Health

Core Platform Health: APIs · connectors · queues · databases · websites · automation · email · SMS · AI · payments · hosting.

Super Admin sees this centrally (feeds Platform Intelligence live tools).

---

## 36. Most Important Principle

**Do not build DigitalGate as a collection of features.** Build it as:

```
DIGITALGATE
│
├── CORE
│
├── UNIVERSAL OBJECTS
│
├── CONNECTOR LAYER
│
├── AI SERVICE
│
├── EVENT BUS
│
├── AUTOMATION ENGINE
│
├── INTELLIGENCE / SCORING
│
├── BUSINESS APPS
│
├── GROWTH APPS
│
├── COMMAND CENTRE
│
└── INFRASTRUCTURE
```

Everything else plugs into this architecture.

---

## Immediate Priority (1–15)

**Do not attempt to build all 36 items simultaneously.**

Immediate architectural priorities:

1. Universal Objects  
2. Multi-tenant organisation architecture  
3. Connector framework  
4. Business Identity  
5. AI Service + Knowledge Layer  
6. Tool Registry  
7. Event Bus  
8. Automation Engine  
9. Permissions / Security  
10. Audit Log  
11. Billing + Entitlements  
12. Platform Health  
13. Infrastructure abstraction  
14. Documentation architecture  
15. Internationalisation foundations  

Once these are right, Apps develop much faster without compromising the platform.

---

## Strategic north star

DigitalGate should ultimately become:

> **The intelligent operating layer between a business and its entire digital ecosystem.**

The business should not need to understand: APIs · CRMs · DNS · hosting · SEO · AI · automation · payments · communications · analytics · websites · integrations.

DigitalGate should connect them, understand them, and increasingly operate them.

The user should simply be able to say:

> **“Here’s my business. Help me run and grow it.”**

That is the north star for the architecture.

---

## Explicit non-goals (this lock)

- Implementing all §§1–36 as a single programme  
- Full Industry Intelligence crawler / news product  
- Full Platform Intelligence agent (Phases 2–4) before Knowledge + Tool Registry foundations  
- Native mobile apps before PWA validation  
- Social/community feed distraction  
- Separate Wantd technology stack  
- Hard-coding Australia, Stripe, Dreamscape, or one LLM into Core Apps  

---

## Document control

| Field | Value |
|-------|--------|
| Owner | Founder & Platform Architect |
| Consumers | Developers, AI agents, future team |
| Change process | ADR or PR against this file + update Alignment notes if locks shift |
| Sibling stack diagram | Also reflected in [CONNECTOR-PRIORITY.md](../foundations/CONNECTOR-PRIORITY.md) · [PLATFORM-ARCHITECTURE.md](../PLATFORM-ARCHITECTURE.md) |
