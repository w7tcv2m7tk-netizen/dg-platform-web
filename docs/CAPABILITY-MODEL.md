# DigitalGate Capability Model

**From Apps to Business Capabilities — the Digital Operating System map**

**Version:** 0.1  
**Last updated:** August 2026  
**Status:** Design — guides App registration and roadmap prioritisation

**Related:** [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) (Gen 2 north-star) · [foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md) (**canonical App hierarchy**) · [strategy/DIGITALGATE-ROLLOUT.md](./strategy/DIGITALGATE-ROLLOUT.md) (GTM / rollout) · [PRODUCT-VISION.md](./PRODUCT-VISION.md) · [PLATFORM-ARCHITECTURE.md](./PLATFORM-ARCHITECTURE.md) · [PLATFORM-PRINCIPLES.md](./PLATFORM-PRINCIPLES.md)

---

## Strategic shift

DigitalGate is not a CRM with add-ons. It is a **Digital Operating System** — the place where a business manages everything digital from one unified platform.

Customers still **buy and install Apps**, but internally we organise work by **Business Capability** — a coherent area of value the platform delivers. Public/commercial packaging follows the locked hierarchy:

```
CORE → INFRASTRUCTURE → INDUSTRY → GROWTH
```

Logic: **run · power · specialise · grow**. See [foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md).

```
DigitalGate Platform
├── Core                    ← CRM, Contacts, Opportunities, Tasks, Calendar, Documents, Communications, Commerce
├── Infrastructure          ← Websites / Website Builder, Domains, DNS, Hosting, Email, SSL, Website Management, Backups, Cloudflare
├── Industry Apps           ← RE, Accommodation, Services, Finance, Commercial, Automotive, Creator, …
├── Growth Apps             ← AI Visibility, SEO, Analytics, Social, AI Comms, Reviews, Prospecting / Opportunity Engine
├── Platform capabilities   ← AI, Automation, Event Bus, Digital Twin, Intelligence, Connectors (NOT Apps — across everything)
├── Command Centre          ← staff cockpit
└── Platform                ← Settings / administration
```

**Apps are the packaging.** Capabilities are the architecture. DigitalGate is an **operating platform with Apps**, not an App marketplace. **Core owns Opportunities; Command Centre orchestrates them.** **Business Services** is the provider-agnostic Core capability; **Business Setup / Start Your Business** is the customer surface (launch stages: Identify → Register → Establish → Build → Connect → Grow) — not a Growth App, not an “ASIC App” — [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md). **Business Identity Service** merges ABR (+ later ASIC / domain / Google / user) into Business Profile. Connectors under Business Services: ABR, ASIC (AU registry), Domain/Hosting (Dreamscape), Google, Social. **AI Brand Studio** is a Core/platform surface (roadmap; sits in Build) — [foundations/BRAND-STUDIO.md](./foundations/BRAND-STUDIO.md). **Industry Intelligence** is a platform Intelligence capability (not “News”, not a standalone App initially) — Collect → Filter → Understand → Personalise → Act; Industry Apps define feed profiles; feeds AI Service, Search, Reporting, Notifications, Opportunity Engine / Command Centre — [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md). **Platform Intelligence** (Platform AI / Platform Knowledge) is the foundational Gen 2 layer for docs + live truth + tools — [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md); distinct from cohort [DIGITALGATE-INTELLIGENCE.md](./foundations/DIGITALGATE-INTELLIGENCE.md). **Reviews** is a Growth App (customer surface) on Core Universal Review plumbing — [foundations/REVIEWS-AND-REFERRALS.md](./foundations/REVIEWS-AND-REFERRALS.md). **Services** is one Industry App with Service Templates (not Electrician/Plumber Apps) — [foundations/SERVICES-APP.md](./foundations/SERVICES-APP.md). **Automation** is a platform capability (not a Growth App).

---

## The boundary rule

Before adding any feature, ask:

> **Would a business reasonably expect to manage this as part of its digital presence?**

| Answer | Action |
|--------|--------|
| **Yes** | Belongs in the DigitalGate ecosystem — as Core, App, Connector surface, or Shared Service |
| **No** | Stays external, or integrate via Connector only |

This keeps the vision ambitious without scope drift into unrelated tooling.

**Execution filter (current phase):** Does this strengthen **Platform Core** or the **Real Estate App**? If no, defer — even when the capability rule says yes.

---

## Orchestration principle

**Own the experience. Integrate specialist infrastructure.**

| DigitalGate owns | Providers own |
|------------------|---------------|
| UX, onboarding, business logic | Speech synthesis, STT |
| CRM / object context | Domain registrar APIs |
| Automations, scoring, recommendations | CDN, edge hosting |
| Prompt templates, approval gates | LLM inference |
| Deploy orchestration, health dashboards | Raw hosting compute |

Same pattern across Communications (ElevenLabs), Infrastructure (registrar API), Websites (AI codegen), and Hosting (Vercel/Cloudflare).

**Connector build order** (what to integrate when): [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) — DigitalGate 15 + immediate programme. Platform value chain: Core → Connector Layer → Universal Objects → AI → Scoring → Automation → Command Centre → BI.

---

## App ↔ Capability mapping

| Manifest ID | Tier | Capability group |
|-------------|------|------------------|
| `crm` | core | Core |
| `reviews` | growth | Reviews (Growth App; Core Universal Review plumbing) |
| `opportunities` | core | Opportunities (Core) |
| `real-estate` | industry | Industry Apps |
| `seo` | growth | Growth Apps |
| `ai-visibility` | growth | Growth Apps |
| `analytics` | growth | Growth Apps |
| `automation` | platform | Platform capability (not a Growth App) |
| `social` | growth | Growth Apps (publishing deferred) |
| `ai-communications` | growth | Growth Apps (Voice AI deferred) |
| `websites` | infrastructure | Infrastructure |
| `infrastructure` | infrastructure | Infrastructure |
| `command-centre` | internal | Intelligence (incl. Business Discovery Engine — see foundations/BUSINESS-DISCOVERY.md) |

---

## Build order (recommended)

| Phase | Focus |
|-------|-------|
| **1.0** | Core + CRM + RE v0 — system of record |
| **1.5** | RE properties, WP sync, scores read-only |
| **2.0** | Website Health Centre; AI Content Studio |
| **2.5** | Infrastructure — domains/DNS via API |
| **3.0** | AI Website Studio; AI Funnel Builder |
| **3.5** | Hosting management |
| **4.0** | AI Developer |

---

## Related architecture docs

| Capability | Document |
|------------|----------|
| Gen 2 Architecture Brief (north-star) | [architecture/GEN-2-ARCHITECTURE-BRIEF.md](./architecture/GEN-2-ARCHITECTURE-BRIEF.md) |
| Business Services · Business Setup | [foundations/BUSINESS-SETUP.md](./foundations/BUSINESS-SETUP.md) |
| Industry Intelligence (platform Intelligence) | [foundations/INDUSTRY-INTELLIGENCE.md](./foundations/INDUSTRY-INTELLIGENCE.md) |
| App hierarchy (canonical) | [foundations/APP-HIERARCHY.md](./foundations/APP-HIERARCHY.md) |
| Platform Intelligence (Platform AI / Knowledge) | [ai/PLATFORM-INTELLIGENCE.md](./ai/PLATFORM-INTELLIGENCE.md) |
| Opportunity Engine™ | [foundations/OPPORTUNITY-ENGINE.md](./foundations/OPPORTUNITY-ENGINE.md) |
| Connector Engine · Priority stack / DG15 | [foundations/CONNECTOR-ENGINE.md](./foundations/CONNECTOR-ENGINE.md) · [foundations/CONNECTOR-PRIORITY.md](./foundations/CONNECTOR-PRIORITY.md) |
| Communications | [ai/COMMUNICATIONS-ARCHITECTURE.md](./ai/COMMUNICATIONS-ARCHITECTURE.md) |
| Websites | [websites/WEBSITES-ARCHITECTURE.md](./websites/WEBSITES-ARCHITECTURE.md) |
| Infrastructure | [infrastructure/INFRASTRUCTURE-ARCHITECTURE.md](./infrastructure/INFRASTRUCTURE-ARCHITECTURE.md) |

---

## Related manifests

| App | Path |
|-----|------|
| Websites | `packages/platform-core/src/apps/builtins/websites.ts` |
| Infrastructure | `packages/platform-core/src/apps/builtins/infrastructure.ts` |
| AI Communications | `packages/platform-core/src/apps/builtins/ai-communications.ts` |
